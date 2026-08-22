import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { inspectBytes } from "@/lib/crypto/inspect";
import { decodeSecretKeyHex, encodeDidKey, generateEd25519KeyPair } from "@/lib/crypto/ed25519";
import { credentialHash, issueCredential } from "@/lib/credentials/issue";
import { buildPresentation, signPresentation, verifyPresentation } from "@/lib/credentials/presentation";
import type { IssuedCredential } from "@/lib/credentials/types";
import { decodeStatusList, emptyStatusList, encodeStatusList, setBit } from "@/lib/credentials/status-list";
import { issueStatusListCredential } from "@/lib/credentials/status-list-credential";
import { renderDiplomaPdf } from "@/lib/documents/diploma";
import { buildEvidence, parseEvidence, type DocumentEvidence } from "@/lib/documents/evidence";
import { verifyCredential, type VerificationResult } from "@/lib/verification/pipeline";
import { persistVerificationReport } from "@/lib/verification/persist";
import { createStoredRequest, loadStoredRequest, submitStoredResponse } from "@/lib/oid4vp/persist";
import { verifyVerificationReport } from "@/lib/verification/report";
import { generateApiKey } from "@/lib/api/keys";
import { generateWebhookSecret, assertWebhookUrl } from "@/lib/webhooks/hmac";
import { buildEvidencePack, assertEvidencePackMinimized } from "@/lib/evidence/pack";
import { COMPLIANCE_MATRIX } from "@/lib/compliance/matrix";
import { didDocumentHash, didKeyFromMultibase, resolveDidKey } from "@/lib/identity/did";
import { didWebForTenant } from "@/lib/identity/did-web";
import { resolveDid } from "@/lib/identity/resolve";
import { assertActiveSigningKey, createHolderIdentity, createIssuerIdentity } from "@/lib/identity/keys";
import { assertPermission, permissionMap } from "@/lib/identity/roles";
import { AUDIT_GENESIS, verifyAuditSequence } from "@/lib/audit/chain";
import { ensureDemoSeed } from "./seed";
import { audit, getLedger, getStorage, publishedStatusResolve, readDocumentBytes, runtimeAdapterStatus } from "./runtime";
import { DEMO, newId, opaqueRef } from "./ids";
import { openSecret, sealSecret } from "./seal";

type CredentialRow = {
  id: string;
  tenant_id: string;
  issuer_id: string;
  document_id: string | null;
  opaque_ref: string;
  holder_name: string;
  degree_name: string;
  credential_json: string;
  credential_hash: string;
  document_hash: string;
  status: string;
  valid_from: string;
  valid_until: string | null;
  issued_at: string;
};

function toResultView(
  result: VerificationResult,
  extra?: { holderName?: string; degreeName?: string; opaqueRef?: string; reportRef?: string },
) {
  return {
    ...result,
    holderName: extra?.holderName,
    degreeName: extra?.degreeName,
    opaqueRef: extra?.opaqueRef,
    reportRef: extra?.reportRef,
  };
}

export const getDemoCatalog = createServerFn({ method: "GET" }).handler(async () => {
  await ensureDemoSeed();
  return {
    valid: DEMO.validRef,
    revoked: DEMO.revokedRef,
    expired: DEMO.expiredRef,
    didWeb: DEMO.webRef,
    cases: [
      {
        ref: DEMO.validRef,
        label: "Valid diploma",
        holder: "Alex Rivera",
        expected: "VALID",
      },
      {
        ref: DEMO.revokedRef,
        label: "Revoked diploma",
        holder: "Jordan Hale",
        expected: "REVOKED",
      },
      {
        ref: DEMO.expiredRef,
        label: "Expired diploma",
        holder: "Sam Okonkwo",
        expected: "EXPIRED",
      },
      {
        ref: DEMO.webRef,
        label: "did:web issuer",
        holder: "Alex Rivera",
        expected: "VALID",
      },
    ],
  };
});

const verifyInput = z.object({
  ref: z.string().min(3).max(80),
  mode: z.enum(["bound", "tampered", "none"]).default("bound"),
  uploadB64: z.string().max(8_000_000).optional(),
});

export const verifyOpaqueRef = createServerFn({ method: "POST" })
  .validator((raw: unknown) => verifyInput.parse(raw))
  .handler(async ({ data }) => {
    await ensureDemoSeed();
    const sql = await getSql();
    const rows = await sql<CredentialRow>`
      select id, tenant_id, issuer_id, document_id, opaque_ref, holder_name, degree_name,
             credential_json, credential_hash, document_hash, status,
             valid_from::text as valid_from, valid_until::text as valid_until, issued_at::text as issued_at
      from credentials where opaque_ref = ${data.ref}`;
    const row = rows[0];
    if (!row) {
      return toResultView({
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
      });
    }
    const credential = JSON.parse(row.credential_json) as Record<string, unknown>;
    let documentBytes: Uint8Array | undefined;
    if (data.mode === "bound" && row.document_id) {
      const docs = await sql<{ content_b64: string | null; object_name: string }>`
        select content_b64, object_name from documents where id = ${row.document_id}`;
      if (docs[0]) documentBytes = await readDocumentBytes(docs[0].object_name, docs[0].content_b64);
    } else if (data.mode === "tampered") {
      const docs = await sql<{ content_b64: string | null; object_name: string }>`
        select content_b64, object_name from documents where id = ${DEMO.tamperedDocId}`;
      if (docs[0]) documentBytes = await readDocumentBytes(docs[0].object_name, docs[0].content_b64);
    } else if (data.uploadB64) {
      const bytes = Uint8Array.from(Buffer.from(data.uploadB64, "base64"));
      inspectBytes(bytes);
      documentBytes = bytes;
    }
    const ledger = await getLedger();
    const result = await verifyCredential(
      {
        credential,
        documentBytes,
        statusListResolve: publishedStatusResolve(),
      },
      ledger,
    );
    const persisted = await persistVerificationReport({
      result,
      credential,
      opaqueRef: data.ref,
      credentialRowId: row.id,
      tenantId: row.tenant_id,
    });
    await audit({
      tenantId: row.tenant_id,
      action: "credential.verified",
      resourceType: "credential",
      resourceId: row.id,
      metadata: { status: result.status, mode: data.mode, reportRef: persisted.reportRef },
    });
    return toResultView(result, {
      holderName: row.holder_name,
      degreeName: row.degree_name,
      opaqueRef: row.opaque_ref,
      reportRef: persisted.reportRef,
    });
  });

export const verifyUploaded = createServerFn({ method: "POST" })
  .validator((raw: unknown) =>
    z
      .object({
        credentialJson: z.string().min(2).max(200_000),
        documentB64: z.string().max(8_000_000).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    await ensureDemoSeed();
    let credential: Record<string, unknown>;
    try {
      credential = JSON.parse(data.credentialJson) as Record<string, unknown>;
    } catch {
      return toResultView({
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
        reasons: ["Credential JSON could not be parsed."],
      });
    }
    let documentBytes: Uint8Array | undefined;
    if (data.documentB64) {
      const bytes = Uint8Array.from(Buffer.from(data.documentB64, "base64"));
      inspectBytes(bytes);
      documentBytes = bytes;
    }
    const sql = await getSql();
    const id = typeof credential.id === "string" ? credential.id : "";
    const ledger = await getLedger();
    const result = await verifyCredential(
      {
        credential,
        documentBytes,
        statusListResolve: publishedStatusResolve(),
      },
      ledger,
    );
    const persisted = await persistVerificationReport({
      result,
      credential,
      credentialRowId: id || null,
    });
    const subject = credential.credentialSubject as { name?: string; degree?: { name?: string } } | undefined;
    return toResultView(result, {
      holderName: subject?.name,
      degreeName: subject?.degree?.name,
      reportRef: persisted.reportRef,
    });
  });

export const downloadDocument = createServerFn({ method: "POST" })
  .validator((raw: unknown) =>
    z.object({ kind: z.enum(["valid", "tampered", "revoked", "expired"]) }).parse(raw),
  )
  .handler(async ({ data }) => {
    await ensureDemoSeed();
    const sql = await getSql();
    const ref =
      data.kind === "valid"
        ? DEMO.validRef
        : data.kind === "revoked"
          ? DEMO.revokedRef
          : data.kind === "expired"
            ? DEMO.expiredRef
            : null;
    if (data.kind === "tampered") {
      const docs = await sql<{ content_b64: string | null; mime: string; object_name: string }>`
        select content_b64, mime, object_name from documents where id = ${DEMO.tamperedDocId}`;
      const doc = docs[0];
      if (!doc) throw new Error("Demo document missing");
      const bytes = await readDocumentBytes(doc.object_name, doc.content_b64);
      return { content_b64: Buffer.from(bytes).toString("base64"), mime: doc.mime, object_name: doc.object_name };
    }
    const rows = await sql<{ document_id: string | null }>`select document_id from credentials where opaque_ref = ${ref}`;
    const docId = rows[0]?.document_id;
    if (!docId) throw new Error("Demo document missing");
    const docs = await sql<{ content_b64: string | null; mime: string; object_name: string }>`
      select content_b64, mime, object_name from documents where id = ${docId}`;
    const doc = docs[0];
    if (!doc) throw new Error("Demo document missing");
    const bytes = await readDocumentBytes(doc.object_name, doc.content_b64);
    return { content_b64: Buffer.from(bytes).toString("base64"), mime: doc.mime, object_name: doc.object_name };
  });

export const getPublicCredential = createServerFn({ method: "POST" })
  .validator((raw: unknown) => z.object({ ref: z.string().min(3).max(80) }).parse(raw))
  .handler(async ({ data }) => {
    await ensureDemoSeed();
    const sql = await getSql();
    const rows = await sql<CredentialRow>`
      select id, tenant_id, issuer_id, document_id, opaque_ref, holder_name, degree_name,
             credential_json, credential_hash, document_hash, status,
             valid_from::text as valid_from, valid_until::text as valid_until, issued_at::text as issued_at
      from credentials where opaque_ref = ${data.ref}`;
    const row = rows[0];
    if (!row) return null;
    const credential = JSON.parse(row.credential_json) as Record<string, unknown>;
    const issuer = credential.issuer as { name?: string; id?: string };
    return {
      ref: row.opaque_ref,
      holderName: row.holder_name,
      degreeName: row.degree_name,
      issuerName: issuer?.name ?? "Issuer",
      issuerDid: issuer?.id ?? "",
      status: row.status,
      issuedAt: row.issued_at,
      validUntil: row.valid_until,
      documentHash: row.document_hash,
      credentialHash: row.credential_hash,
    };
  });

export const getLedgerSummary = createServerFn({ method: "GET" }).handler(async () => {
  await ensureDemoSeed();
  const ledger = await getLedger();
  const chain = await ledger.verifyChain();
  const latest = await ledger.getLatestBlock();
  const blocks = await ledger.listBlocks();
  const adapters = runtimeAdapterStatus();
  return {
    adapter: ledger.name,
    integrityModel: chain.model,
    storage: adapters.storage,
    kms: adapters.kmsName,
    chain,
    latest,
    blocks: blocks.slice(-12).reverse().map((b) => ({
      seq: b.seq,
      blockHash: b.blockHash,
      previousHash: b.previousHash,
      payloadHash: b.payloadHash,
      kind: b.payload.kind,
      timestamp: b.timestamp,
    })),
  };
});

type Workspace = {
  tenantId: string;
  role: string;
  issuerId: string;
  issuerDid: string;
  issuerName: string;
  orgName: string;
};

async function workspaceFor(userId: string): Promise<Workspace> {
  const sql = await getSql();
  const existing = await sql<{ tenant_id: string; role: string }>`
    select tenant_id, role from memberships where user_id = ${userId} limit 1`;
  if (existing[0]) {
    const tenantId = existing[0].tenant_id;
    const issuers = await sql<{ id: string; did: string; name: string }>`
      select id, did, name from issuers where tenant_id = ${tenantId} limit 1`;
    const orgs = await sql<{ name: string }>`select name from organizations where tenant_id = ${tenantId} limit 1`;
    const issuer = issuers[0];
    if (!issuer) throw new Error("Issuer missing for tenant");
    return {
      tenantId,
      role: existing[0].role,
      issuerId: issuer.id,
      issuerDid: issuer.did,
      issuerName: issuer.name,
      orgName: orgs[0]?.name ?? "Organization",
    };
  }

  const tenantId = newId("tenant");
  const orgId = newId("org");
  const issuerId = newId("iss");
  const identity = createIssuerIdentity(sealSecret);
  const did = identity.did;
  await sql`insert into tenants (id, slug, name, kind) values (${tenantId}, ${tenantId}, ${"Issuer workspace"}, ${"CUSTOMER"})`;
  await sql`insert into memberships (id, tenant_id, user_id, role, status) values (${newId("mem")}, ${tenantId}, ${userId}, ${"TENANT_ADMIN"}, ${"ACTIVE"})`;
  await sql`insert into organizations (id, tenant_id, name, org_type, status) values (${orgId}, ${tenantId}, ${"Your organization"}, ${"UNIVERSITY"}, ${"ACTIVE"})`;
  await sql`insert into issuers (id, tenant_id, organization_id, name, did, status) values (${issuerId}, ${tenantId}, ${orgId}, ${"Registrar"}, ${did}, ${"ACTIVE"})`;
  await sql`insert into dids (id, tenant_id, did, document_json, public_key_multibase, status, document_hash) values (
    ${newId("did")}, ${tenantId}, ${did}, ${JSON.stringify(identity.document)}, ${identity.publicKeyMultibase}, ${"ACTIVE"}, ${identity.documentHash}
  )`;
  await sql`insert into key_secrets (id, tenant_id, did, secret_key_hex, status, public_key_multibase, purpose) values (
    ${newId("key")}, ${tenantId}, ${did}, ${identity.sealedSecretHex}, ${"ACTIVE"}, ${identity.publicKeyMultibase}, ${"assertionMethod"}
  )`;
  const encoded = encodeStatusList(emptyStatusList());
  const statusListId = `https://trust.matrixly.ai/credentials/status/${issuerId}`;
  const slc = issueStatusListCredential({
    credentialId: statusListId,
    issuerDid: did,
    issuerName: "Registrar",
    encodedList: encoded,
    secretKey: identity.keys.secretKey,
    validFrom: new Date().toISOString(),
  });
  await sql`insert into status_lists (id, tenant_id, issuer_id, encoded_list, next_index, credential_json, credential_hash) values (
    ${statusListId}, ${tenantId}, ${issuerId}, ${encoded}, ${0}, ${JSON.stringify(slc)}, ${credentialHash(slc)}
  )`;
  const ledger = await getLedger();
  await ledger.registerDid({
    did,
    documentHash: identity.documentHash,
    publicKeyMultibase: identity.publicKeyMultibase,
    status: "ACTIVE",
  });
  await ledger.registerIssuer({
    issuerId: did,
    issuerDid: did,
    name: "Registrar",
    status: "ACTIVE",
    publicKeyMultibase: identity.publicKeyMultibase,
  });
  await audit({
    tenantId,
    actorUserId: userId,
    action: "issuer.activated",
    resourceType: "issuer",
    resourceId: issuerId,
  });
  return {
    tenantId,
    role: "TENANT_ADMIN",
    issuerId,
    issuerDid: did,
    issuerName: "Registrar",
    orgName: "Your organization",
  };
}

export const getWorkspace = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await ensureDemoSeed();
    const ws = await workspaceFor(context.userId);
    const sql = await getSql();
    const stats = await sql<{
      issued: number;
      revoked: number;
      verifications: number;
      documents: number;
    }>`
      select
        (select count(*) from credentials where tenant_id = ${ws.tenantId}) as issued,
        (select count(*) from credentials where tenant_id = ${ws.tenantId} and status = 'REVOKED') as revoked,
        (select count(*) from verification_requests) as verifications,
        (select count(*) from documents where tenant_id = ${ws.tenantId}) as documents
    `;
    const dids = await sql<{ did: string; public_key_multibase: string; created_at: string; status: string }>`
      select did, public_key_multibase, created_at::text as created_at, coalesce(status, 'ACTIVE') as status
      from dids where tenant_id = ${ws.tenantId} order by created_at desc`;
    return {
      ...ws,
      userId: context.userId,
      permissions: permissionMap(ws.role),
      stats: {
        issued: Number(stats[0]?.issued ?? 0),
        revoked: Number(stats[0]?.revoked ?? 0),
        verifications: Number(stats[0]?.verifications ?? 0),
        documents: Number(stats[0]?.documents ?? 0),
      },
      dids,
    };
  });

export const listIssuerCredentials = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const ws = await workspaceFor(context.userId);
    const sql = await getSql();
    return sql<{
      id: string;
      opaque_ref: string;
      holder_name: string;
      degree_name: string;
      status: string;
      document_hash: string;
      issued_at: string;
      claim_token: string | null;
      delivery_status: string | null;
    }>`
      select c.id, c.opaque_ref, c.holder_name, c.degree_name, c.status, c.document_hash,
             c.issued_at::text as issued_at, d.claim_token, d.status as delivery_status
      from credentials c
      left join credential_deliveries d on d.credential_id = c.id
      where c.tenant_id = ${ws.tenantId}
      order by c.issued_at desc`;
  });

type PersistedDocument = {
  id: string;
  hash: string;
  evidence: DocumentEvidence;
  deduped: boolean;
  status: string;
};

async function persistDocument(input: {
  tenantId: string;
  issuerId: string;
  userId: string;
  bytes: Uint8Array;
  origin: DocumentEvidence["origin"];
  originalName?: string;
}): Promise<PersistedDocument> {
  const built = buildEvidence(input.bytes, input.origin);
  const sql = await getSql();
  const existing = await sql<{ id: string; status: string; evidence_json: string | null }>`
    select id, status, evidence_json from documents
    where tenant_id = ${input.tenantId} and hash = ${built.evidence.hash}
    limit 1`;
  if (existing[0]) {
    return {
      id: existing[0].id,
      hash: built.evidence.hash,
      evidence: parseEvidence(existing[0].evidence_json) ?? built.evidence,
      deduped: true,
      status: existing[0].status,
    };
  }
  const id = newId("doc");
  const storage = await getStorage();
  await storage.put(built.evidence.objectName, input.bytes, built.evidence.mime);
  const contentB64 = storage.keepsBytesInDb ? Buffer.from(input.bytes).toString("base64") : null;
  await sql`
    insert into documents (
      id, tenant_id, issuer_id, object_name, mime, byte_length, hash_algorithm, hash, status,
      content_b64, origin, inspected_kind, evidence_json, original_name, storage_backend
    ) values (
      ${id}, ${input.tenantId}, ${input.issuerId}, ${built.evidence.objectName}, ${built.evidence.mime},
      ${built.evidence.byteLength}, ${"sha256"}, ${built.evidence.hash}, ${"HASHED"},
      ${contentB64}, ${built.evidence.origin}, ${built.evidence.kind},
      ${JSON.stringify(built.evidence)}, ${input.originalName ?? null}, ${storage.name}
    )`;
  await audit({
    tenantId: input.tenantId,
    actorUserId: input.userId,
    action: "document.ingested",
    resourceType: "document",
    resourceId: id,
    metadata: { hash: built.evidence.hash, origin: built.evidence.origin, mime: built.evidence.mime },
  });
  return { id, hash: built.evidence.hash, evidence: built.evidence, deduped: false, status: "HASHED" };
}

export const ingestDocument = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((raw: unknown) =>
    z
      .object({
        uploadB64: z.string().min(8).max(8_000_000),
        originalName: z.string().max(200).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ context, data }) => {
    const ws = await workspaceFor(context.userId);
    assertPermission(ws.role, "ingest");
    const bytes = Uint8Array.from(Buffer.from(data.uploadB64, "base64"));
    const persisted = await persistDocument({
      tenantId: ws.tenantId,
      issuerId: ws.issuerId,
      userId: context.userId,
      bytes,
      origin: "UPLOADED",
      originalName: data.originalName,
    });
    return {
      id: persisted.id,
      hash: persisted.hash,
      evidence: persisted.evidence,
      deduped: persisted.deduped,
      status: persisted.status,
    };
  });

export const listDocuments = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const ws = await workspaceFor(context.userId);
    assertPermission(ws.role, "readDocuments");
    const sql = await getSql();
    return sql<{
      id: string;
      hash: string;
      mime: string;
      byte_length: number;
      status: string;
      origin: string;
      inspected_kind: string | null;
      original_name: string | null;
      created_at: string;
      storage_backend: string;
    }>`
      select id, hash, mime, byte_length, status, coalesce(origin, 'GENERATED') as origin,
             inspected_kind, original_name, created_at::text as created_at,
             coalesce(storage_backend, 'db') as storage_backend
      from documents
      where tenant_id = ${ws.tenantId}
      order by created_at desc`;
  });

export const downloadIssuerDocument = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((raw: unknown) => z.object({ id: z.string().min(8) }).parse(raw))
  .handler(async ({ context, data }) => {
    const ws = await workspaceFor(context.userId);
    assertPermission(ws.role, "readDocuments");
    const sql = await getSql();
    const rows = await sql<{ content_b64: string | null; mime: string; object_name: string }>`
      select content_b64, mime, object_name from documents
      where id = ${data.id} and tenant_id = ${ws.tenantId}`;
    const doc = rows[0];
    if (!doc) throw new Error("Document not found");
    const bytes = await readDocumentBytes(doc.object_name, doc.content_b64);
    return { content_b64: Buffer.from(bytes).toString("base64"), mime: doc.mime, object_name: doc.object_name };
  });

export const issueDegree = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((raw: unknown) =>
    z
      .object({
        holderName: z.string().min(2).max(80),
        degreeName: z.string().min(2).max(120),
        idempotencyKey: z.string().min(8).max(80),
        documentId: z.string().min(8).max(80).optional(),
        uploadB64: z.string().max(8_000_000).optional(),
        originalName: z.string().max(200).optional(),
        holderDid: z.string().min(12).max(200).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ context, data }) => {
    const ws = await workspaceFor(context.userId);
    assertPermission(ws.role, "issue");
    const sql = await getSql();
    const replay = await sql<{ opaque_ref: string; id: string }>`
      select opaque_ref, id from credentials
      where tenant_id = ${ws.tenantId} and idempotency_key = ${data.idempotencyKey}`;
    if (replay[0]) {
      const deliveries = await sql<{ claim_token: string }>`
        select claim_token from credential_deliveries where credential_id = ${replay[0].id}`;
      return {
        ref: replay[0].opaque_ref,
        id: replay[0].id,
        claimToken: deliveries[0]?.claim_token,
        replayed: true,
      };
    }

    const secrets = await sql<{ secret_key_hex: string; status: string }>`
      select secret_key_hex, status from key_secrets
      where tenant_id = ${ws.tenantId} and did = ${ws.issuerDid} and status = 'ACTIVE'`;
    const sealed = secrets[0]?.secret_key_hex;
    if (!sealed) throw new Error("Signing key is not available");
    assertActiveSigningKey(secrets[0]!.status);
    const secretKey = decodeSecretKeyHex(openSecret(sealed));

    const lists = await sql<{ id: string; encoded_list: string; next_index: number }>`
      select id, encoded_list, next_index from status_lists where issuer_id = ${ws.issuerId} limit 1`;
    const list = lists[0];
    if (!list) throw new Error("Status list missing");
    const index = Number(list.next_index);
    const credId = `urn:uuid:${crypto.randomUUID()}`;
    const issuedAt = new Date().toISOString();

    let persisted: PersistedDocument;
    if (data.documentId) {
      const rows = await sql<{ id: string; hash: string; status: string; evidence_json: string | null }>`
        select id, hash, status, evidence_json from documents
        where id = ${data.documentId} and tenant_id = ${ws.tenantId}`;
      const row = rows[0];
      if (!row) throw new Error("Document not found in this tenant");
      if (row.status === "ISSUED") throw new Error("Document is already bound to a credential");
      persisted = {
        id: row.id,
        hash: row.hash,
        evidence: parseEvidence(row.evidence_json) ?? {
          algorithm: "sha256",
          hash: row.hash,
          mime: "application/pdf",
          kind: "pdf",
          byteLength: 0,
          objectName: row.id,
          origin: "UPLOADED",
        },
        deduped: true,
        status: row.status,
      };
    } else if (data.uploadB64) {
      const bytes = Uint8Array.from(Buffer.from(data.uploadB64, "base64"));
      persisted = await persistDocument({
        tenantId: ws.tenantId,
        issuerId: ws.issuerId,
        userId: context.userId,
        bytes,
        origin: "UPLOADED",
        originalName: data.originalName,
      });
      if (persisted.status === "ISSUED") throw new Error("Document is already bound to a credential");
    } else {
      const pdf = await renderDiplomaPdf({
        university: ws.orgName,
        holder: data.holderName,
        degree: data.degreeName,
        issued: new Date(issuedAt).toLocaleDateString("en-US", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        credentialId: credId,
      });
      persisted = await persistDocument({
        tenantId: ws.tenantId,
        issuerId: ws.issuerId,
        userId: context.userId,
        bytes: pdf,
        origin: "GENERATED",
      });
    }
    const documentHash = persisted.hash;
    let subjectId: string | undefined;
    if (data.holderDid) {
      const resolved = resolveDidKey(data.holderDid);
      if (!resolved.ok) throw new Error(`Holder DID could not be resolved: ${resolved.reason}`);
      subjectId = data.holderDid;
    }
    const credential = issueCredential({
      credentialId: credId,
      issuerDid: ws.issuerDid,
      issuerName: `${ws.issuerName}, ${ws.orgName}`,
      subjectName: data.holderName,
      subjectId,
      degreeName: data.degreeName,
      validFrom: issuedAt,
      documentHash,
      statusListCredentialId: list.id,
      statusListIndex: index,
      secretKey,
    });
    const docId = persisted.id;
    const ref = opaqueRef();
    await sql`
      update documents set status = 'ISSUED', issuer_id = ${ws.issuerId}
      where id = ${docId} and tenant_id = ${ws.tenantId}`;
    await sql`
      insert into credentials (
        id, tenant_id, issuer_id, document_id, opaque_ref, holder_name, degree_name,
        credential_json, credential_hash, document_hash, status, valid_from,
        status_list_index, idempotency_key, issued_at, holder_did
      ) values (
        ${credId}, ${ws.tenantId}, ${ws.issuerId}, ${docId}, ${ref}, ${data.holderName}, ${data.degreeName},
        ${JSON.stringify(credential)}, ${credentialHash(credential)}, ${documentHash}, ${"ACTIVE"},
        ${issuedAt}, ${index}, ${data.idempotencyKey}, ${issuedAt}, ${subjectId ?? null}
      )`;
    await sql`
      update status_lists set next_index = ${index + 1}, updated_at = now()
      where id = ${list.id} and issuer_id = ${ws.issuerId}`;
    const ledger = await getLedger();
    await ledger.registerDocumentAnchor({
      documentHash,
      credentialId: credId,
      issuerDid: ws.issuerDid,
    });
    await ledger.registerCredential({
      credentialId: credId,
      credentialHash: credentialHash(credential),
      documentHash,
      issuerId: ws.issuerDid,
      issuerDid: ws.issuerDid,
      status: "ACTIVE",
      issuedAt,
      version: 1,
    });
    const claimToken = opaqueRef();
    await sql`
      insert into credential_deliveries (id, credential_id, tenant_id, claim_token, status)
      values (${newId("dlv")}, ${credId}, ${ws.tenantId}, ${claimToken}, ${"PENDING"})`;
    await audit({
      tenantId: ws.tenantId,
      actorUserId: context.userId,
      action: "credential.issued",
      resourceType: "credential",
      resourceId: credId,
      metadata: { ref },
    });
    return { ref, id: credId, claimToken, replayed: false };
  });

export const revokeCredential = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((raw: unknown) => z.object({ id: z.string().min(8) }).parse(raw))
  .handler(async ({ context, data }) => {
    const ws = await workspaceFor(context.userId);
    assertPermission(ws.role, "revoke");
    const sql = await getSql();
    const rows = await sql<{ id: string; status_list_index: number }>`
      select id, status_list_index from credentials where id = ${data.id} and tenant_id = ${ws.tenantId}`;
    const row = rows[0];
    if (!row) throw new Error("Credential not found");
    await sql`
      update credentials set status = 'REVOKED', revoked_at = now()
      where id = ${row.id} and tenant_id = ${ws.tenantId}`;
    const lists = await sql<{ id: string; encoded_list: string }>`
      select id, encoded_list from status_lists where issuer_id = ${ws.issuerId} limit 1`;
    if (lists[0]) {
      const next = encodeStatusList(setBit(decodeStatusList(lists[0].encoded_list), Number(row.status_list_index), true));
      const secrets = await sql<{ secret_key_hex: string; status: string }>`
        select secret_key_hex, status from key_secrets
        where tenant_id = ${ws.tenantId} and did = ${ws.issuerDid} and status = 'ACTIVE'`;
      const sealed = secrets[0]?.secret_key_hex;
      if (!sealed) throw new Error("Signing key is not available");
      assertActiveSigningKey(secrets[0]!.status);
      const slc = issueStatusListCredential({
        credentialId: lists[0].id,
        issuerDid: ws.issuerDid,
        issuerName: `${ws.issuerName}, ${ws.orgName}`,
        encodedList: next,
        secretKey: decodeSecretKeyHex(openSecret(sealed)),
      });
      await sql`update status_lists
        set encoded_list = ${next}, credential_json = ${JSON.stringify(slc)}, credential_hash = ${credentialHash(slc)}, updated_at = now()
        where id = ${lists[0].id}`;
    }
    const ledger = await getLedger();
    await ledger.setCredentialStatus({
      credentialId: row.id,
      status: "REVOKED",
      reason: "Issuer revocation",
      at: new Date().toISOString(),
    });
    await audit({
      tenantId: ws.tenantId,
      actorUserId: context.userId,
      action: "credential.revoked",
      resourceType: "credential",
      resourceId: row.id,
    });
    return { ok: true };
  });

export const listAudit = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const ws = await workspaceFor(context.userId);
    assertPermission(ws.role, "readAudit");
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      action: string;
      resource_type: string;
      resource_id: string | null;
      created_at: string;
      prev_hash: string | null;
      event_hash: string | null;
      metadata_json: string;
    }>`
      select id, action, resource_type, resource_id, created_at::text as created_at,
             prev_hash, event_hash, metadata_json
      from audit_events
      where tenant_id = ${ws.tenantId}
      order by created_at asc
      limit 200`;
    const linked = rows
      .filter((r) => r.event_hash && r.prev_hash)
      .map((r) => ({
        id: r.id,
        action: r.action,
        resourceType: r.resource_type,
        resourceId: r.resource_id,
        metadata: JSON.parse(r.metadata_json || "{}") as Record<string, unknown>,
        createdAt: r.created_at,
        prevHash: r.prev_hash!,
        eventHash: r.event_hash!,
      }));
    const chain = verifyAuditSequence(linked);
    return {
      chain,
      genesis: AUDIT_GENESIS,
      events: [...rows].reverse().map((r) => ({
        id: r.id,
        action: r.action,
        resource_type: r.resource_type,
        resource_id: r.resource_id,
        created_at: r.created_at,
        event_hash: r.event_hash,
      })),
    };
  });

export const getPublicVerificationReport = createServerFn({ method: "POST" })
  .validator((raw: unknown) => z.object({ ref: z.string().min(6).max(80) }).parse(raw))
  .handler(async ({ data }) => {
    await ensureDemoSeed();
    const sql = await getSql();
    const rows = await sql<{
      report_json: string | null;
      report_hash: string | null;
      verifier_did: string | null;
      ledger_block_hash: string | null;
      result_status: string;
      opaque_report_ref: string | null;
    }>`
      select report_json, report_hash, verifier_did, ledger_block_hash, result_status, opaque_report_ref
      from verification_requests
      where opaque_report_ref = ${data.ref}`;
    const row = rows[0];
    if (!row?.report_json) throw new Error("Verification report not found");
    const report = JSON.parse(row.report_json) as Record<string, unknown>;
    const proof = verifyVerificationReport(report);
    const ledger = await getLedger();
    const anchor = row.report_hash ? await ledger.getVerificationAnchor(row.report_hash) : null;
    const chain = await ledger.verifyChain();
    return {
      ref: row.opaque_report_ref,
      resultStatus: row.result_status,
      reportJson: row.report_json,
      reportHash: row.report_hash,
      verifierDid: row.verifier_did,
      ledgerBlockHash: row.ledger_block_hash,
      signatureValid: proof.ok,
      signatureReason: proof.reason ?? null,
      ledgerAnchored: Boolean(anchor),
      chainValid: chain.valid,
    };
  });

export const listKeys = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const ws = await workspaceFor(context.userId);
    assertPermission(ws.role, "readKeys");
    const sql = await getSql();
    const keys = await sql<{
      did: string;
      public_key_multibase: string;
      status: string;
      document_hash: string | null;
      created_at: string;
      key_status: string | null;
    }>`
      select
        d.did,
        d.public_key_multibase,
        coalesce(d.status, 'ACTIVE') as status,
        d.document_hash,
        d.created_at::text as created_at,
        k.status as key_status
      from dids d
      left join key_secrets k on k.did = d.did and k.tenant_id = d.tenant_id
      where d.tenant_id = ${ws.tenantId}
      order by d.created_at desc`;
    const tenant = await sql<{ slug: string }>`select slug from tenants where id = ${ws.tenantId} limit 1`;
    const slug = tenant[0]?.slug ?? ws.tenantId;
    const webDid = didWebForTenant(slug);
    return {
      role: ws.role,
      issuerDid: ws.issuerDid,
      webDid,
      webDocumentPath: `/did-web/${slug}`,
      permissions: permissionMap(ws.role),
      kms: runtimeAdapterStatus().kmsName,
      keys,
    };
  });

export const rotateIssuerKey = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const ws = await workspaceFor(context.userId);
    assertPermission(ws.role, "rotateKeys");
    const sql = await getSql();
    const identity = createIssuerIdentity(sealSecret);
    const previousDid = ws.issuerDid;
    const now = new Date().toISOString();

    await sql`
      update key_secrets
      set status = 'ROTATED', rotated_at = ${now}, rotated_to_did = ${identity.did}
      where tenant_id = ${ws.tenantId} and did = ${previousDid} and status = 'ACTIVE'`;
    await sql`
      update dids
      set status = 'ROTATED', superseded_by = ${identity.did}, rotated_at = ${now}
      where tenant_id = ${ws.tenantId} and did = ${previousDid}`;
    await sql`
      insert into dids (id, tenant_id, did, document_json, public_key_multibase, status, document_hash)
      values (
        ${newId("did")}, ${ws.tenantId}, ${identity.did}, ${JSON.stringify(identity.document)},
        ${identity.publicKeyMultibase}, ${"ACTIVE"}, ${identity.documentHash}
      )`;
    await sql`
      insert into key_secrets (id, tenant_id, did, secret_key_hex, status, public_key_multibase, purpose)
      values (
        ${newId("key")}, ${ws.tenantId}, ${identity.did}, ${identity.sealedSecretHex},
        ${"ACTIVE"}, ${identity.publicKeyMultibase}, ${"assertionMethod"}
      )`;
    await sql`
      update issuers set did = ${identity.did}
      where id = ${ws.issuerId} and tenant_id = ${ws.tenantId}`;

    const ledger = await getLedger();
    await ledger.registerDid({
      did: identity.did,
      documentHash: identity.documentHash,
      publicKeyMultibase: identity.publicKeyMultibase,
      status: "ACTIVE",
      controllerDid: previousDid,
    });
    await ledger.registerIssuer({
      issuerId: identity.did,
      issuerDid: identity.did,
      name: ws.issuerName,
      status: "ACTIVE",
      publicKeyMultibase: identity.publicKeyMultibase,
    });
    await audit({
      tenantId: ws.tenantId,
      actorUserId: context.userId,
      action: "issuer.key.rotated",
      resourceType: "did",
      resourceId: identity.did,
      metadata: { previousDid },
    });
    return {
      did: identity.did,
      publicKeyMultibase: identity.publicKeyMultibase,
      previousDid,
      documentHash: identity.documentHash,
    };
  });

export const resolveDidDocument = createServerFn({ method: "POST" })
  .validator((raw: unknown) =>
    z
      .object({
        did: z.string().min(8).max(200).optional(),
        multibase: z.string().min(8).max(200).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    const did = data.did ?? (data.multibase ? didKeyFromMultibase(data.multibase) : "");
    const resolved = await resolveDid(did);
    if (!resolved.ok) {
      return { ok: false as const, reason: resolved.reason, did };
    }
    const sql = await getSql();
    const rows = await sql<{
      status: string;
      document_hash: string | null;
      public_key_multibase: string;
    }>`
      select coalesce(status, 'ACTIVE') as status, document_hash, public_key_multibase
      from dids where did = ${resolved.did} or public_key_multibase = ${resolved.publicKeyMultibase} limit 1`;
    const registered = rows[0];
    return {
      ok: true as const,
      did: resolved.did,
      method: resolved.method,
      publicKeyMultibase: resolved.publicKeyMultibase,
      verificationMethod: resolved.verificationMethod,
      document: resolved.document,
      documentHash: didDocumentHash(resolved.document),
      registered: Boolean(registered),
      registryStatus: registered?.status ?? "UNREGISTERED",
    };
  });

export const getIssuerCredential = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((raw: unknown) => z.object({ id: z.string().min(8) }).parse(raw))
  .handler(async ({ context, data }) => {
    const ws = await workspaceFor(context.userId);
    const sql = await getSql();
    const rows = await sql<CredentialRow>`
      select id, tenant_id, issuer_id, document_id, opaque_ref, holder_name, degree_name,
             credential_json, credential_hash, document_hash, status,
             valid_from::text as valid_from, valid_until::text as valid_until, issued_at::text as issued_at
      from credentials where id = ${data.id} and tenant_id = ${ws.tenantId}`;
    return rows[0] ?? null;
  });

type HolderRow = { id: string; did: string; display_name: string | null };

async function holderFor(userId: string): Promise<HolderRow> {
  const sql = await getSql();
  const existing = await sql<HolderRow>`
    select id, did, display_name from holders where user_id = ${userId}`;
  if (existing[0]) return existing[0];
  const identity = createHolderIdentity(sealSecret);
  const id = newId("hld");
  await sql`
    insert into holders (id, user_id, did) values (${id}, ${userId}, ${identity.did})`;
  await sql`
    insert into holder_keys (id, holder_id, did, secret_key_hex, public_key_multibase, status)
    values (
      ${newId("hkey")}, ${id}, ${identity.did}, ${identity.sealedSecretHex},
      ${identity.publicKeyMultibase}, ${"ACTIVE"}
    )`;
  await audit({
    actorUserId: userId,
    action: "holder.created",
    resourceType: "holder",
    resourceId: id,
    metadata: { did: identity.did },
  });
  return { id, did: identity.did, display_name: null };
}

export const getHolderWallet = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const holder = await holderFor(context.userId);
    const sql = await getSql();
    const items = await sql<{
      id: string;
      credential_id: string;
      holder_name: string;
      degree_name: string;
      issuer_did: string;
      document_hash: string;
      opaque_ref: string;
      claimed_at: string;
    }>`
      select id, credential_id, holder_name, degree_name, issuer_did, document_hash,
             opaque_ref, claimed_at::text as claimed_at
      from wallet_items
      where holder_id = ${holder.id}
      order by claimed_at desc`;
    const presentations = await sql<{
      id: string;
      opaque_ref: string;
      credential_id: string;
      created_at: string;
    }>`
      select id, opaque_ref, credential_id, created_at::text as created_at
      from presentations
      where holder_id = ${holder.id}
      order by created_at desc`;
    return { holder, items, presentations };
  });

export const getClaimOffer = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((raw: unknown) => z.object({ token: z.string().min(6).max(80) }).parse(raw))
  .handler(async ({ data }) => {
    await ensureDemoSeed();
    const sql = await getSql();
    const rows = await sql<{
      claim_token: string;
      status: string;
      holder_name: string;
      degree_name: string;
      issuer_did: string | null;
    }>`
      select d.claim_token, d.status, c.holder_name, c.degree_name, i.did as issuer_did
      from credential_deliveries d
      join credentials c on c.id = d.credential_id
      left join issuers i on i.id = c.issuer_id
      where d.claim_token = ${data.token}`;
    const row = rows[0];
    if (!row) throw new Error("Claim token is not valid");
    return row;
  });

export const claimCredential = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((raw: unknown) => z.object({ token: z.string().min(6).max(80) }).parse(raw))
  .handler(async ({ context, data }) => {
    await ensureDemoSeed();
    const holder = await holderFor(context.userId);
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      credential_id: string;
      status: string;
      holder_id: string | null;
      credential_json: string;
      document_hash: string;
      holder_name: string;
      degree_name: string;
      opaque_ref: string;
      issuer_did: string | null;
    }>`
      select d.id, d.credential_id, d.status, d.holder_id, c.credential_json, c.document_hash,
             c.holder_name, c.degree_name, c.opaque_ref, i.did as issuer_did
      from credential_deliveries d
      join credentials c on c.id = d.credential_id
      left join issuers i on i.id = c.issuer_id
      where d.claim_token = ${data.token}`;
    const row = rows[0];
    if (!row) throw new Error("Claim token is not valid");
    if (row.status === "CLAIMED" && row.holder_id && row.holder_id !== holder.id) {
      throw new Error("This credential has already been claimed");
    }
    const existing = await sql<{ id: string }>`
      select id from wallet_items where holder_id = ${holder.id} and credential_id = ${row.credential_id}`;
    if (!existing[0]) {
      await sql`
        insert into wallet_items (
          id, holder_id, credential_id, credential_json, issuer_did, document_hash,
          holder_name, degree_name, opaque_ref
        ) values (
          ${newId("wal")}, ${holder.id}, ${row.credential_id}, ${row.credential_json},
          ${row.issuer_did ?? ""}, ${row.document_hash}, ${row.holder_name}, ${row.degree_name},
          ${row.opaque_ref}
        )`;
    }
    await sql`
      update credential_deliveries
      set status = 'CLAIMED', holder_id = ${holder.id}, holder_did = ${holder.did}, claimed_at = now()
      where id = ${row.id}`;
    await sql`
      update credentials set holder_did = ${holder.did} where id = ${row.credential_id}`;
    await audit({
      actorUserId: context.userId,
      action: "credential.claimed",
      resourceType: "credential",
      resourceId: row.credential_id,
      metadata: { holderDid: holder.did },
    });
    return { credentialId: row.credential_id, holderDid: holder.did };
  });

export const createPresentation = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((raw: unknown) => z.object({ walletItemId: z.string().min(8) }).parse(raw))
  .handler(async ({ context, data }) => {
    const holder = await holderFor(context.userId);
    const sql = await getSql();
    const items = await sql<{ id: string; credential_id: string; credential_json: string }>`
      select id, credential_id, credential_json from wallet_items
      where id = ${data.walletItemId} and holder_id = ${holder.id}`;
    const item = items[0];
    if (!item) throw new Error("Wallet item not found");
    const keys = await sql<{ secret_key_hex: string; status: string }>`
      select secret_key_hex, status from holder_keys
      where holder_id = ${holder.id} and did = ${holder.did} and status = 'ACTIVE'`;
    const sealed = keys[0]?.secret_key_hex;
    if (!sealed) throw new Error("Holder signing key is not available");
    assertActiveSigningKey(keys[0]!.status);
    const secretKey = decodeSecretKeyHex(openSecret(sealed));
    const credential = JSON.parse(item.credential_json) as IssuedCredential;
    const presentation = signPresentation(
      buildPresentation({
        presentationId: `urn:uuid:${crypto.randomUUID()}`,
        holderDid: holder.did,
        credential,
      }),
      secretKey,
    );
    const ref = opaqueRef();
    await sql`
      insert into presentations (id, holder_id, opaque_ref, presentation_json, credential_id)
      values (${newId("vp")}, ${holder.id}, ${ref}, ${JSON.stringify(presentation)}, ${item.credential_id})`;
    await audit({
      actorUserId: context.userId,
      action: "presentation.created",
      resourceType: "presentation",
      resourceId: ref,
      metadata: { credentialId: item.credential_id },
    });
    return { ref };
  });

export const verifyPresentationRef = createServerFn({ method: "POST" })
  .validator((raw: unknown) =>
    z
      .object({
        ref: z.string().min(3).max(80),
        mode: z.enum(["bound", "none"]).default("bound"),
        uploadB64: z.string().max(8_000_000).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    await ensureDemoSeed();
    const sql = await getSql();
    const rows = await sql<{
      presentation_json: string;
      credential_id: string;
      opaque_ref: string;
    }>`
      select presentation_json, credential_id, opaque_ref from presentations where opaque_ref = ${data.ref}`;
    const row = rows[0];
    if (!row) {
      return {
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
        status: "INVALID" as const,
        reasons: ["Presentation not found"],
        holderProofValid: false,
        holderMatchesSubject: null,
      };
    }
    const presentation = JSON.parse(row.presentation_json) as Record<string, unknown>;
    const creds = await sql<CredentialRow>`
      select id, tenant_id, issuer_id, document_id, opaque_ref, holder_name, degree_name,
             credential_json, credential_hash, document_hash, status,
             valid_from::text as valid_from, valid_until::text as valid_until, issued_at::text as issued_at
      from credentials where id = ${row.credential_id}`;
    const cred = creds[0];
    let documentBytes: Uint8Array | undefined;
    if (data.uploadB64) {
      const bytes = Uint8Array.from(Buffer.from(data.uploadB64, "base64"));
      inspectBytes(bytes);
      documentBytes = bytes;
    } else if (data.mode === "bound" && cred?.document_id) {
      const docs = await sql<{ content_b64: string | null; object_name: string }>`
        select content_b64, object_name from documents where id = ${cred.document_id}`;
      if (docs[0]) documentBytes = await readDocumentBytes(docs[0].object_name, docs[0].content_b64);
    }
    const ledger = await getLedger();
    const result = await verifyPresentation(presentation, ledger, {
      documentBytes,
      statusListResolve: publishedStatusResolve(),
    });
    const persisted = await persistVerificationReport({
      result,
      credential: cred
        ? (JSON.parse(cred.credential_json) as Record<string, unknown>)
        : (JSON.parse(row.presentation_json) as Record<string, unknown>),
      opaqueRef: data.ref,
      credentialRowId: row.credential_id,
      tenantId: cred?.tenant_id,
    });
    return toResultView(
      { ...result, reasons: result.reasons },
      cred
        ? { holderName: cred.holder_name, degreeName: cred.degree_name, opaqueRef: data.ref, reportRef: persisted.reportRef }
        : { opaqueRef: data.ref, reportRef: persisted.reportRef },
    );
  });

export const getPublicStatusList = createServerFn({ method: "POST" })
  .validator((raw: unknown) => z.object({ id: z.string().min(2).max(200) }).parse(raw))
  .handler(async ({ data }) => {
    await ensureDemoSeed();
    const sql = await getSql();
    const needle = data.id.startsWith("http") ? data.id : `%${data.id}`;
    const rows = await sql<{
      id: string;
      encoded_list: string;
      credential_json: string | null;
      credential_hash: string | null;
      next_index: number;
      updated_at: string;
    }>`
      select id, encoded_list, credential_json, credential_hash, next_index, updated_at::text as updated_at
      from status_lists
      where id = ${data.id} or id like ${needle}
      order by updated_at desc
      limit 1`;
    const row = rows[0];
    if (!row) throw new Error("Status list not found");
    return {
      id: row.id,
      credentialJson: row.credential_json,
      credentialHash: row.credential_hash,
      nextIndex: Number(row.next_index),
      updatedAt: row.updated_at,
      signed: Boolean(row.credential_json),
    };
  });

export const getIssuerStatusList = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const ws = await workspaceFor(context.userId);
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      next_index: number;
      credential_hash: string | null;
      updated_at: string;
      credential_json: string | null;
    }>`
      select id, next_index, credential_hash, updated_at::text as updated_at, credential_json
      from status_lists where issuer_id = ${ws.issuerId} limit 1`;
    const row = rows[0];
    if (!row) throw new Error("Status list missing");
    return {
      id: row.id,
      nextIndex: Number(row.next_index),
      credentialHash: row.credential_hash,
      updatedAt: row.updated_at,
      signed: Boolean(row.credential_json),
      issuerDid: ws.issuerDid,
    };
  });

export const listApiKeys = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const ws = await workspaceFor(context.userId);
    assertPermission(ws.role, "manageApiKeys");
    const sql = await getSql();
    const keys = await sql<{
      id: string;
      name: string;
      prefix: string;
      status: string;
      last_used_at: string | null;
      created_at: string;
    }>`
      select id, name, prefix, status, last_used_at::text as last_used_at, created_at::text as created_at
      from verifier_api_keys
      where tenant_id = ${ws.tenantId}
      order by created_at desc`;
    return { keys, role: ws.role };
  });

export const createApiKey = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((raw: unknown) => z.object({ name: z.string().min(2).max(80) }).parse(raw))
  .handler(async ({ context, data }) => {
    const ws = await workspaceFor(context.userId);
    assertPermission(ws.role, "manageApiKeys");
    const generated = generateApiKey();
    const sql = await getSql();
    const id = newId("key");
    await sql`
      insert into verifier_api_keys (id, tenant_id, created_by_user_id, name, prefix, secret_hash, status)
      values (${id}, ${ws.tenantId}, ${context.userId}, ${data.name}, ${generated.prefix}, ${generated.secretHash}, ${"ACTIVE"})`;
    await audit({
      tenantId: ws.tenantId,
      actorUserId: context.userId,
      action: "api_key.created",
      resourceType: "api_key",
      resourceId: id,
      metadata: { prefix: generated.prefix, name: data.name },
    });
    return { id, prefix: generated.prefix, secret: generated.secret, name: data.name };
  });

export const revokeApiKey = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((raw: unknown) => z.object({ id: z.string().min(8) }).parse(raw))
  .handler(async ({ context, data }) => {
    const ws = await workspaceFor(context.userId);
    assertPermission(ws.role, "manageApiKeys");
    const sql = await getSql();
    const now = new Date().toISOString();
    await sql`
      update verifier_api_keys
      set status = ${"REVOKED"}, revoked_at = ${now}
      where id = ${data.id} and tenant_id = ${ws.tenantId} and status = ${"ACTIVE"}`;
    await audit({
      tenantId: ws.tenantId,
      actorUserId: context.userId,
      action: "api_key.revoked",
      resourceType: "api_key",
      resourceId: data.id,
    });
    return { ok: true };
  });

export const listWebhooks = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const ws = await workspaceFor(context.userId);
    assertPermission(ws.role, "manageWebhooks");
    const sql = await getSql();
    const endpoints = await sql<{
      id: string;
      name: string;
      url: string;
      prefix: string;
      status: string;
      created_at: string;
    }>`
      select id, name, url, prefix, status, created_at::text as created_at
      from webhook_endpoints where tenant_id = ${ws.tenantId} order by created_at desc`;
    const deliveries = await sql<{
      id: string;
      endpoint_id: string;
      status: string;
      http_status: number | null;
      created_at: string;
      payload_hash: string;
    }>`
      select id, endpoint_id, status, http_status, created_at::text as created_at, payload_hash
      from webhook_deliveries where tenant_id = ${ws.tenantId}
      order by created_at desc limit 20`;
    return { endpoints, deliveries };
  });

export const createWebhook = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((raw: unknown) =>
    z.object({ name: z.string().min(2).max(80), url: z.string().min(12).max(500) }).parse(raw),
  )
  .handler(async ({ context, data }) => {
    const ws = await workspaceFor(context.userId);
    assertPermission(ws.role, "manageWebhooks");
    const url = assertWebhookUrl(data.url);
    const generated = generateWebhookSecret();
    const sql = await getSql();
    const id = newId("whk");
    await sql`
      insert into webhook_endpoints (id, tenant_id, created_by_user_id, name, url, secret_sealed, prefix, status)
      values (${id}, ${ws.tenantId}, ${context.userId}, ${data.name}, ${url}, ${sealSecret(generated.secret)}, ${generated.prefix}, ${"ACTIVE"})`;
    await audit({
      tenantId: ws.tenantId,
      actorUserId: context.userId,
      action: "webhook.created",
      resourceType: "webhook",
      resourceId: id,
      metadata: { prefix: generated.prefix, url },
    });
    return { id, prefix: generated.prefix, secret: generated.secret, url, name: data.name };
  });

export const revokeWebhook = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((raw: unknown) => z.object({ id: z.string().min(8) }).parse(raw))
  .handler(async ({ context, data }) => {
    const ws = await workspaceFor(context.userId);
    assertPermission(ws.role, "manageWebhooks");
    const sql = await getSql();
    const now = new Date().toISOString();
    await sql`
      update webhook_endpoints
      set status = ${"REVOKED"}, revoked_at = ${now}
      where id = ${data.id} and tenant_id = ${ws.tenantId} and status = ${"ACTIVE"}`;
    await audit({
      tenantId: ws.tenantId,
      actorUserId: context.userId,
      action: "webhook.revoked",
      resourceType: "webhook",
      resourceId: data.id,
    });
    return { ok: true };
  });

export const getEvidencePack = createServerFn({ method: "POST" })
  .validator((raw: unknown) => z.object({ ref: z.string().min(3).max(80) }).parse(raw))
  .handler(async ({ data }) => {
    await ensureDemoSeed();
    const sql = await getSql();
    const byReport = await sql<{
      report_json: string | null;
      report_hash: string | null;
      result_json: string;
      opaque_report_ref: string | null;
      credential_id: string | null;
    }>`
      select report_json, report_hash, result_json, opaque_report_ref, credential_id
      from verification_requests
      where opaque_report_ref = ${data.ref} or opaque_ref = ${data.ref}
      order by created_at desc
      limit 1`;
    const row = byReport[0];
    if (!row?.report_json) throw new Error("Evidence pack not found");
    const report = JSON.parse(row.report_json) as Record<string, unknown>;
    const result = JSON.parse(row.result_json) as Parameters<typeof buildEvidencePack>[0]["result"];
    const proof = verifyVerificationReport(report);
    const ledger = await getLedger();
    const chain = await ledger.verifyChain();
    const anchor = row.report_hash ? await ledger.getVerificationAnchor(row.report_hash) : null;
    const pack = buildEvidencePack({
      result,
      credentialId: typeof report.credentialId === "string" ? report.credentialId : row.credential_id ?? undefined,
      credentialHash: typeof report.credentialHash === "string" ? report.credentialHash : undefined,
      reportRef: row.opaque_report_ref ?? undefined,
      reportHash: row.report_hash ?? undefined,
      reportJson: row.report_json,
      reportSignatureValid: proof.ok,
      ledgerAnchored: Boolean(anchor),
      adapter: ledger.name,
      integrityModel: chain.model,
    });
    assertEvidencePackMinimized(pack);
    return pack;
  });

export const getComplianceMatrix = createServerFn({ method: "GET" }).handler(async () => ({
  disclaimer:
    "This is an engineering control matrix, not a SOC 2, ISO 27001, eIDAS, or GDPR certification.",
  controls: COMPLIANCE_MATRIX,
}));

export const getDidWebDocument = createServerFn({ method: "GET" })
  .validator((raw: unknown) => z.object({ slug: z.string().min(2).max(80) }).parse(raw ?? { slug: "global-university" }))
  .handler(async ({ data }) => {
    await ensureDemoSeed();
    const did = didWebForTenant(data.slug);
    const resolved = await resolveDid(did);
    if (!resolved.ok) throw new Error(resolved.reason);
    const slug = data.slug;
    return { did, slug, method: resolved.method, document: resolved.document };
  });

export const createOid4vpRequest = createServerFn({ method: "POST" })
  .validator((raw: unknown) =>
    z.object({ origin: z.string().min(8).max(200).regex(/^https?:\/\//) }).parse(raw),
  )
  .handler(async ({ data }) => {
    await ensureDemoSeed();
    return createStoredRequest(data.origin);
  });

export const getOid4vpRequest = createServerFn({ method: "GET" })
  .validator((raw: unknown) => z.object({ id: z.string().min(8).max(80) }).parse(raw))
  .handler(async ({ data }) => {
    await ensureDemoSeed();
    const stored = await loadStoredRequest(data.id);
    if (!stored) throw new Error("OpenID4VP request not found");
    return stored;
  });

export const submitOid4vpResponse = createServerFn({ method: "POST" })
  .validator((raw: unknown) =>
    z
      .object({
        id: z.string().min(8).max(80),
        vpToken: z.unknown(),
        state: z.string().max(200).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    await ensureDemoSeed();
    return submitStoredResponse({ id: data.id, vpToken: data.vpToken, state: data.state });
  });

export const simulateOid4vpWallet = createServerFn({ method: "POST" })
  .validator((raw: unknown) => z.object({ id: z.string().min(8).max(80) }).parse(raw))
  .handler(async ({ data }) => {
    await ensureDemoSeed();
    const stored = await loadStoredRequest(data.id);
    if (!stored) throw new Error("OpenID4VP request not found");
    const sql = await getSql();
    const rows = await sql<{ credential_json: string }>`
      select credential_json from credentials where opaque_ref = ${DEMO.validRef}`;
    if (!rows[0]) throw new Error("Demo diploma is missing");
    const credential = JSON.parse(rows[0].credential_json) as IssuedCredential;
    const holder = generateEd25519KeyPair();
    const holderDid = encodeDidKey(holder.publicKey);
    const presentation = signPresentation(
      buildPresentation({
        presentationId: `urn:uuid:${crypto.randomUUID()}`,
        holderDid,
        credential,
      }),
      holder.secretKey,
      new Date().toISOString(),
      { challenge: stored.request.nonce, domain: stored.request.client_id },
    );
    const queryId = stored.request.dcql_query.credentials[0]?.id ?? "degree";
    return submitStoredResponse({
      id: data.id,
      vpToken: { [queryId]: [presentation] },
      state: stored.request.state,
    });
  });

export const fulfillOid4vpFromWallet = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((raw: unknown) =>
    z.object({ id: z.string().min(8).max(80), walletItemId: z.string().min(8) }).parse(raw),
  )
  .handler(async ({ context, data }) => {
    const holder = await holderFor(context.userId);
    const stored = await loadStoredRequest(data.id);
    if (!stored) throw new Error("OpenID4VP request not found");
    const sql = await getSql();
    const items = await sql<{ credential_json: string }>`
      select credential_json from wallet_items where id = ${data.walletItemId} and holder_id = ${holder.id}`;
    const item = items[0];
    if (!item) throw new Error("Wallet item not found");
    const keys = await sql<{ secret_key_hex: string; status: string }>`
      select secret_key_hex, status from holder_keys
      where holder_id = ${holder.id} and did = ${holder.did} and status = 'ACTIVE'`;
    const sealed = keys[0]?.secret_key_hex;
    if (!sealed) throw new Error("Holder signing key is not available");
    assertActiveSigningKey(keys[0]!.status);
    const presentation = signPresentation(
      buildPresentation({
        presentationId: `urn:uuid:${crypto.randomUUID()}`,
        holderDid: holder.did,
        credential: JSON.parse(item.credential_json) as IssuedCredential,
      }),
      decodeSecretKeyHex(openSecret(sealed)),
      new Date().toISOString(),
      { challenge: stored.request.nonce, domain: stored.request.client_id },
    );
    const queryId = stored.request.dcql_query.credentials[0]?.id ?? "degree";
    return submitStoredResponse({
      id: data.id,
      vpToken: { [queryId]: [presentation] },
      state: stored.request.state,
    });
  });

