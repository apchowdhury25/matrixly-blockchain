import { getSql } from "@/lib/db";
import { inspectBytes } from "@/lib/crypto/inspect";
import { credentialHash } from "@/lib/credentials/issue";
import { verifyPresentation } from "@/lib/credentials/presentation";
import { verifyCredential, type VerificationResult } from "@/lib/verification/pipeline";
import { persistVerificationReport } from "@/lib/verification/persist";
import { audit, getLedger, publishedStatusResolve, readDocumentBytes } from "@/lib/trust/runtime";
import { hashesMatch, hashApiKey, parseBearer } from "./keys";
import { toMachineResult, type MachineVerification } from "./machine";

export type ApiKeyRecord = {
  id: string;
  tenantId: string;
  prefix: string;
};

export async function authenticateApiKey(authorization: string | null): Promise<ApiKeyRecord | null> {
  const secret = parseBearer(authorization);
  if (!secret) return null;
  const digest = hashApiKey(secret);
  const sql = await getSql();
  const rows = await sql<{ id: string; tenant_id: string; prefix: string; secret_hash: string; status: string }>`
    select id, tenant_id, prefix, secret_hash, status from verifier_api_keys
    where secret_hash = ${digest} and status = ${"ACTIVE"}
    limit 1`;
  const match = rows[0];
  if (!match || !hashesMatch(match.secret_hash, digest)) return null;
  await sql`update verifier_api_keys set last_used_at = ${new Date().toISOString()} where id = ${match.id}`;
  return { id: match.id, tenantId: match.tenant_id, prefix: match.prefix };
}

type CredentialRow = {
  id: string;
  tenant_id: string;
  issuer_id: string;
  document_id: string | null;
  opaque_ref: string;
  holder_name: string;
  degree_name: string;
  credential_json: string;
};

async function documentFor(documentId: string | null, mode: "bound" | "none", uploadB64?: string) {
  if (uploadB64) {
    const bytes = Uint8Array.from(Buffer.from(uploadB64, "base64"));
    inspectBytes(bytes);
    return bytes;
  }
  if (mode !== "bound" || !documentId) return undefined;
  const sql = await getSql();
  const docs = await sql<{ content_b64: string | null; object_name: string }>`
    select content_b64, object_name from documents where id = ${documentId}`;
  if (!docs[0]) return undefined;
  return readDocumentBytes(docs[0].object_name, docs[0].content_b64);
}

export async function runApiVerification(input: {
  apiKey: ApiKeyRecord;
  ref?: string;
  credential?: Record<string, unknown>;
  presentation?: Record<string, unknown>;
  documentB64?: string;
  mode?: "bound" | "none";
  includeSubject?: boolean;
}): Promise<MachineVerification> {
  const sql = await getSql();
  const mode = input.mode ?? "bound";
  let credential: Record<string, unknown> | undefined = input.credential;
  let row: CredentialRow | undefined;
  let result: VerificationResult;
  const ledger = await getLedger();

  if (input.ref) {
    const rows = await sql<CredentialRow>`
      select id, tenant_id, issuer_id, document_id, opaque_ref, holder_name, degree_name, credential_json
      from credentials where opaque_ref = ${input.ref}`;
    row = rows[0];
    if (!row) {
      result = {
        verified: false,
        issuerVerified: false,
        signatureValid: false,
        documentIntegrityValid: null,
        ledgerProofValid: false,
        statusListValid: null,
        credentialActive: false,
        expired: false,
        revoked: false,
        superseded: false,
        suspended: false,
        status: "INVALID",
        reasons: ["No credential is registered for this verification link."],
      };
      return toMachineResult(result, { includeSubject: input.includeSubject });
    }
    credential = JSON.parse(row.credential_json) as Record<string, unknown>;
  } else if (input.presentation) {
    const inner = input.presentation.verifiableCredential;
    const first = Array.isArray(inner) ? inner[0] : undefined;
    credential = first && typeof first === "object" ? (first as Record<string, unknown>) : undefined;
    const credId = credential && typeof credential.id === "string" ? credential.id : "";
    if (credId) {
      const rows = await sql<CredentialRow>`
        select id, tenant_id, issuer_id, document_id, opaque_ref, holder_name, degree_name, credential_json
        from credentials where id = ${credId}`;
      row = rows[0];
    }
  } else if (credential && typeof credential.id === "string") {
    const rows = await sql<CredentialRow>`
      select id, tenant_id, issuer_id, document_id, opaque_ref, holder_name, degree_name, credential_json
      from credentials where id = ${credential.id}`;
    row = rows[0];
  }

  if (!credential && !input.presentation) {
    throw new Error("Provide ref, credential, or presentation");
  }

  const documentBytes = await documentFor(row?.document_id ?? null, mode, input.documentB64);
  const statusListResolve = publishedStatusResolve();

  if (input.presentation) {
    result = await verifyPresentation(input.presentation, ledger, { documentBytes, statusListResolve });
  } else {
    result = await verifyCredential({ credential: credential!, documentBytes, statusListResolve }, ledger);
  }

  const persisted = await persistVerificationReport({
    result,
    credential: credential ?? {},
    opaqueRef: input.ref ?? row?.opaque_ref,
    credentialRowId: row?.id ?? null,
    tenantId: row?.tenant_id ?? input.apiKey.tenantId,
    apiKeyId: input.apiKey.id,
    source: "api",
  });
  await audit({
    tenantId: input.apiKey.tenantId,
    action: "api.verified",
    resourceType: "credential",
    resourceId: row?.id ?? input.ref ?? null,
    metadata: { status: result.status, keyPrefix: input.apiKey.prefix, reportRef: persisted.reportRef },
  });
  return toMachineResult(result, {
    reportRef: persisted.reportRef,
    reportHash: persisted.reportHash,
    credentialId: typeof credential?.id === "string" ? credential.id : row?.id,
    credentialHash: credential ? credentialHash(credential) : undefined,
    includeSubject: input.includeSubject,
    holderName: row?.holder_name,
    degreeName: row?.degree_name,
  });
}
