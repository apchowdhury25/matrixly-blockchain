import { getSql } from "@/lib/db";
import { verifyOid4vpSubmission, type Oid4vpVerifyResult } from "./verify";
import { buildAuthorizationRequest, walletAuthorizationUrl, type AuthorizationRequest } from "./request";
import { audit, getLedger, publishedStatusResolve, readDocumentBytes } from "@/lib/trust/runtime";
import { persistVerificationReport } from "@/lib/verification/persist";
import { newId } from "@/lib/trust/ids";
import { inspectBytes } from "@/lib/crypto/inspect";

export type StoredOid4vp = {
  id: string;
  status: string;
  request: AuthorizationRequest;
  walletUri: string;
  result?: Oid4vpVerifyResult | null;
  expiresAt: string;
  createdAt: string;
};

export async function createStoredRequest(origin: string, tenantId?: string | null): Promise<StoredOid4vp> {
  const id = newId("oid4vp");
  const request = buildAuthorizationRequest({ origin, requestId: id });
  const walletUri = walletAuthorizationUrl(origin, id, request.client_id);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const sql = await getSql();
  await sql`
    insert into oid4vp_requests (
      id, tenant_id, nonce, state, client_id, response_uri, request_json, dcql_json, status, wallet_uri, expires_at
    ) values (
      ${id}, ${tenantId ?? null}, ${request.nonce}, ${request.state}, ${request.client_id}, ${request.response_uri},
      ${JSON.stringify(request)}, ${JSON.stringify(request.dcql_query)}, ${"OPEN"}, ${walletUri}, ${expiresAt}
    )`;
  await audit({
    tenantId: tenantId ?? undefined,
    action: "oid4vp.request.created",
    resourceType: "oid4vp_request",
    resourceId: id,
    metadata: { clientId: request.client_id },
  });
  return { id, status: "OPEN", request, walletUri, expiresAt, createdAt: new Date().toISOString() };
}

export async function loadStoredRequest(id: string): Promise<StoredOid4vp | null> {
  const sql = await getSql();
  const rows = await sql<{
    id: string;
    status: string;
    request_json: string;
    wallet_uri: string | null;
    result_json: string | null;
    expires_at: string;
    created_at: string;
  }>`
    select id, status, request_json, wallet_uri, result_json, expires_at::text as expires_at, created_at::text as created_at
    from oid4vp_requests where id = ${id}`;
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    status: row.status,
    request: JSON.parse(row.request_json) as AuthorizationRequest,
    walletUri: row.wallet_uri ?? "",
    result: row.result_json ? (JSON.parse(row.result_json) as Oid4vpVerifyResult) : null,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

export async function submitStoredResponse(input: {
  id: string;
  vpToken: unknown;
  state?: string;
  documentB64?: string;
}): Promise<StoredOid4vp> {
  const sql = await getSql();
  const rows = await sql<{
    id: string;
    status: string;
    request_json: string;
    expires_at: string;
    nonce: string;
  }>`
    select id, status, request_json, expires_at::text as expires_at, nonce from oid4vp_requests where id = ${input.id}`;
  const row = rows[0];
  if (!row) throw new Error("OpenID4VP request not found");
  if (row.status !== "OPEN") throw new Error("OpenID4VP request is no longer open (nonce is single-use)");
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await sql`update oid4vp_requests set status = ${"EXPIRED"} where id = ${row.id}`;
    throw new Error("OpenID4VP request expired");
  }
  const request = JSON.parse(row.request_json) as AuthorizationRequest;
  const inner = extractFirstCredential(input.vpToken, request.dcql_query.credentials[0]?.id ?? "degree");
  const credId = typeof inner?.id === "string" ? inner.id : "";
  const creds = credId
    ? await sql<{
        id: string;
        tenant_id: string;
        issuer_id: string;
        document_id: string | null;
        opaque_ref: string;
        credential_json: string;
      }>`
        select id, tenant_id, issuer_id, document_id, opaque_ref, credential_json
        from credentials where id = ${credId}`
    : [];
  const cred = creds[0];
  let documentBytes: Uint8Array | undefined;
  if (input.documentB64) {
    documentBytes = Uint8Array.from(Buffer.from(input.documentB64, "base64"));
    inspectBytes(documentBytes);
  } else if (cred?.document_id) {
    const docs = await sql<{ content_b64: string | null; object_name: string }>`
      select content_b64, object_name from documents where id = ${cred.document_id}`;
    if (docs[0]) documentBytes = await readDocumentBytes(docs[0].object_name, docs[0].content_b64);
  }
  const ledger = await getLedger();
  const result = await verifyOid4vpSubmission(
    {
      request,
      vpToken: input.vpToken,
      state: input.state,
      documentBytes,
      statusListResolve: publishedStatusResolve(),
    },
    ledger,
  );
  await persistVerificationReport({
    result,
    credential: inner ?? {},
    opaqueRef: cred?.opaque_ref,
    credentialRowId: cred?.id ?? null,
    tenantId: cred?.tenant_id,
    source: "oid4vp",
  });
  await sql`
    update oid4vp_requests
    set status = ${"RECEIVED"},
        vp_token_json = ${JSON.stringify(input.vpToken)},
        result_json = ${JSON.stringify(result)},
        received_at = ${new Date().toISOString()}
    where id = ${row.id} and status = ${"OPEN"}`;
  await audit({
    tenantId: cred?.tenant_id,
    action: "oid4vp.response.received",
    resourceType: "oid4vp_request",
    resourceId: row.id,
    metadata: { status: result.status, nonceBound: result.nonceBound },
  });
  const stored = await loadStoredRequest(row.id);
  if (!stored) throw new Error("OpenID4VP request missing after submit");
  return stored;
}

function extractFirstCredential(vpToken: unknown, queryId: string): Record<string, unknown> | null {
  if (!vpToken || typeof vpToken !== "object") return null;
  const rec = vpToken as Record<string, unknown>;
  const slot = rec[queryId];
  const first = Array.isArray(slot) ? slot[0] : rec.type && Array.isArray(rec.type) ? rec : slot;
  if (!first || typeof first !== "object") return null;
  const list = (first as { verifiableCredential?: unknown }).verifiableCredential;
  const cred = Array.isArray(list) ? list[0] : undefined;
  return cred && typeof cred === "object" ? (cred as Record<string, unknown>) : null;
}
