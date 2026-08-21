import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { inspectBytes } from "@/lib/crypto/inspect";
import { decodeSecretKeyHex } from "@/lib/crypto/ed25519";
import { credentialHash, issueCredential } from "@/lib/credentials/issue";
import { decodeStatusList, emptyStatusList, encodeStatusList, setBit } from "@/lib/credentials/status-list";
import { renderDiplomaPdf } from "@/lib/documents/diploma";
import { buildEvidence, parseEvidence, type DocumentEvidence } from "@/lib/documents/evidence";
import { verifyCredential, type VerificationResult } from "@/lib/verification/pipeline";
import { didDocumentHash, didKeyFromMultibase, resolveDidKey } from "@/lib/identity/did";
import { assertActiveSigningKey, createIssuerIdentity } from "@/lib/identity/keys";
import { assertPermission, permissionMap } from "@/lib/identity/roles";
import { ensureDemoSeed } from "./seed";
import { audit, getLedger } from "./runtime";
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

function toResultView(result: VerificationResult, extra?: { holderName?: string; degreeName?: string; opaqueRef?: string }) {
  return {
    ...result,
    holderName: extra?.holderName,
    degreeName: extra?.degreeName,
    opaqueRef: extra?.opaqueRef,
  };
}

export const getDemoCatalog = createServerFn({ method: "GET" }).handler(async () => {
  await ensureDemoSeed();
  return {
    valid: DEMO.validRef,
    revoked: DEMO.revokedRef,
    expired: DEMO.expiredRef,
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
      const docs = await sql<{ content_b64: string }>`select content_b64 from documents where id = ${row.document_id}`;
      if (docs[0]) documentBytes = Uint8Array.from(Buffer.from(docs[0].content_b64, "base64"));
    } else if (data.mode === "tampered") {
      const docs = await sql<{ content_b64: string }>`select content_b64 from documents where id = ${DEMO.tamperedDocId}`;
      if (docs[0]) documentBytes = Uint8Array.from(Buffer.from(docs[0].content_b64, "base64"));
    } else if (data.uploadB64) {
      const bytes = Uint8Array.from(Buffer.from(data.uploadB64, "base64"));
      inspectBytes(bytes);
      documentBytes = bytes;
    }
    const lists = await sql<{ encoded_list: string }>`
      select encoded_list from status_lists where issuer_id = ${row.issuer_id} order by updated_at desc limit 1`;
    const ledger = await getLedger();
    const result = await verifyCredential(
      {
        credential,
        documentBytes,
        encodedStatusList: lists[0]?.encoded_list,
      },
      ledger,
    );
    await sql`
      insert into verification_requests (id, opaque_ref, credential_id, result_status, result_json)
      values (${crypto.randomUUID()}, ${data.ref}, ${row.id}, ${result.status}, ${JSON.stringify(result)})`;
    await audit({
      tenantId: row.tenant_id,
      action: "credential.verified",
      resourceType: "credential",
      resourceId: row.id,
      metadata: { status: result.status, mode: data.mode },
    });
    return toResultView(result, {
      holderName: row.holder_name,
      degreeName: row.degree_name,
      opaqueRef: row.opaque_ref,
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
    const lists = id
      ? await sql<{ encoded_list: string }>`
          select s.encoded_list from credentials c
          join status_lists s on s.issuer_id = c.issuer_id
          where c.id = ${id} limit 1`
      : [];
    const ledger = await getLedger();
    const result = await verifyCredential(
      { credential, documentBytes, encodedStatusList: lists[0]?.encoded_list },
      ledger,
    );
    await sql`
      insert into verification_requests (id, opaque_ref, credential_id, result_status, result_json)
      values (${crypto.randomUUID()}, ${null}, ${id || null}, ${result.status}, ${JSON.stringify(result)})`;
    const subject = credential.credentialSubject as { name?: string; degree?: { name?: string } } | undefined;
    return toResultView(result, {
      holderName: subject?.name,
      degreeName: subject?.degree?.name,
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
      const docs = await sql<{ content_b64: string; mime: string; object_name: string }>`
        select content_b64, mime, object_name from documents where id = ${DEMO.tamperedDocId}`;
      const doc = docs[0];
      if (!doc) throw new Error("Demo document missing");
      return doc;
    }
    const rows = await sql<{ document_id: string | null }>`select document_id from credentials where opaque_ref = ${ref}`;
    const docId = rows[0]?.document_id;
    if (!docId) throw new Error("Demo document missing");
    const docs = await sql<{ content_b64: string; mime: string; object_name: string }>`
      select content_b64, mime, object_name from documents where id = ${docId}`;
    const doc = docs[0];
    if (!doc) throw new Error("Demo document missing");
    return doc;
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
  return {
    adapter: ledger.name,
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
  await sql`insert into status_lists (id, tenant_id, issuer_id, encoded_list, next_index) values (
    ${`https://trust.matrixly.ai/credentials/status/${issuerId}`}, ${tenantId}, ${issuerId}, ${encodeStatusList(emptyStatusList())}, ${0}
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
    }>`
      select id, opaque_ref, holder_name, degree_name, status, document_hash, issued_at::text as issued_at
      from credentials
      where tenant_id = ${ws.tenantId}
      order by issued_at desc`;
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
  await sql`
    insert into documents (
      id, tenant_id, issuer_id, object_name, mime, byte_length, hash_algorithm, hash, status,
      content_b64, origin, inspected_kind, evidence_json, original_name
    ) values (
      ${id}, ${input.tenantId}, ${input.issuerId}, ${built.evidence.objectName}, ${built.evidence.mime},
      ${built.evidence.byteLength}, ${"sha256"}, ${built.evidence.hash}, ${"HASHED"},
      ${Buffer.from(input.bytes).toString("base64")}, ${built.evidence.origin}, ${built.evidence.kind},
      ${JSON.stringify(built.evidence)}, ${input.originalName ?? null}
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
    }>`
      select id, hash, mime, byte_length, status, coalesce(origin, 'GENERATED') as origin,
             inspected_kind, original_name, created_at::text as created_at
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
    const rows = await sql<{ content_b64: string; mime: string; object_name: string }>`
      select content_b64, mime, object_name from documents
      where id = ${data.id} and tenant_id = ${ws.tenantId}`;
    const doc = rows[0];
    if (!doc) throw new Error("Document not found");
    return doc;
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
    if (replay[0]) return { ref: replay[0].opaque_ref, id: replay[0].id, replayed: true };

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
    const credential = issueCredential({
      credentialId: credId,
      issuerDid: ws.issuerDid,
      issuerName: `${ws.issuerName}, ${ws.orgName}`,
      subjectName: data.holderName,
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
        status_list_index, idempotency_key, issued_at
      ) values (
        ${credId}, ${ws.tenantId}, ${ws.issuerId}, ${docId}, ${ref}, ${data.holderName}, ${data.degreeName},
        ${JSON.stringify(credential)}, ${credentialHash(credential)}, ${documentHash}, ${"ACTIVE"},
        ${issuedAt}, ${index}, ${data.idempotencyKey}, ${issuedAt}
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
    await audit({
      tenantId: ws.tenantId,
      actorUserId: context.userId,
      action: "credential.issued",
      resourceType: "credential",
      resourceId: credId,
      metadata: { ref },
    });
    return { ref, id: credId, replayed: false };
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
      await sql`update status_lists set encoded_list = ${next}, updated_at = now() where id = ${lists[0].id}`;
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
    return sql<{
      id: string;
      action: string;
      resource_type: string;
      resource_id: string | null;
      created_at: string;
    }>`
      select id, action, resource_type, resource_id, created_at::text as created_at
      from audit_events
      where tenant_id = ${ws.tenantId}
      order by created_at desc
      limit 50`;
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
    return {
      role: ws.role,
      issuerDid: ws.issuerDid,
      permissions: permissionMap(ws.role),
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
    const resolved = resolveDidKey(did);
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
      from dids where did = ${resolved.did} limit 1`;
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
