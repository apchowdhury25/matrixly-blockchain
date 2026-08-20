import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { inspectBytes } from "@/lib/crypto/inspect";
import { sha256Bytes } from "@/lib/crypto/hash";
import {
  decodeSecretKeyHex,
  didDocument,
  encodeDidKey,
  encodeSecretKeyHex,
  generateEd25519KeyPair,
  publicKeyMultibase,
} from "@/lib/crypto/ed25519";
import { credentialHash, issueCredential } from "@/lib/credentials/issue";
import { decodeStatusList, emptyStatusList, encodeStatusList, setBit } from "@/lib/credentials/status-list";
import { renderDiplomaPdf } from "@/lib/documents/diploma";
import { verifyCredential, type VerificationResult } from "@/lib/verification/pipeline";
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
  const keys = generateEd25519KeyPair();
  const did = encodeDidKey(keys.publicKey);
  await sql`insert into tenants (id, slug, name, kind) values (${tenantId}, ${tenantId}, ${"Issuer workspace"}, ${"CUSTOMER"})`;
  await sql`insert into memberships (id, tenant_id, user_id, role) values (${newId("mem")}, ${tenantId}, ${userId}, ${"TENANT_ADMIN"})`;
  await sql`insert into organizations (id, tenant_id, name, org_type, status) values (${orgId}, ${tenantId}, ${"Your organization"}, ${"UNIVERSITY"}, ${"ACTIVE"})`;
  await sql`insert into issuers (id, tenant_id, organization_id, name, did, status) values (${issuerId}, ${tenantId}, ${orgId}, ${"Registrar"}, ${did}, ${"ACTIVE"})`;
  await sql`insert into dids (id, tenant_id, did, document_json, public_key_multibase) values (
    ${newId("did")}, ${tenantId}, ${did}, ${JSON.stringify(didDocument(did, keys.publicKey))}, ${publicKeyMultibase(keys.publicKey)}
  )`;
  await sql`insert into key_secrets (id, tenant_id, did, secret_key_hex, status) values (
    ${newId("key")}, ${tenantId}, ${did}, ${sealSecret(encodeSecretKeyHex(keys.secretKey))}, ${"ACTIVE"}
  )`;
  await sql`insert into status_lists (id, tenant_id, issuer_id, encoded_list, next_index) values (
    ${`https://trust.matrixly.ai/credentials/status/${issuerId}`}, ${tenantId}, ${issuerId}, ${encodeStatusList(emptyStatusList())}, ${0}
  )`;
  const ledger = await getLedger();
  await ledger.registerIssuer({
    issuerId: did,
    issuerDid: did,
    name: "Registrar",
    status: "ACTIVE",
    publicKeyMultibase: publicKeyMultibase(keys.publicKey),
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
    }>`
      select
        (select count(*) from credentials where tenant_id = ${ws.tenantId}) as issued,
        (select count(*) from credentials where tenant_id = ${ws.tenantId} and status = 'REVOKED') as revoked,
        (select count(*) from verification_requests) as verifications
    `;
    const dids = await sql<{ did: string; public_key_multibase: string; created_at: string }>`
      select did, public_key_multibase, created_at::text as created_at from dids where tenant_id = ${ws.tenantId}`;
    return {
      ...ws,
      userId: context.userId,
      stats: {
        issued: Number(stats[0]?.issued ?? 0),
        revoked: Number(stats[0]?.revoked ?? 0),
        verifications: Number(stats[0]?.verifications ?? 0),
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

export const issueDegree = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((raw: unknown) =>
    z
      .object({
        holderName: z.string().min(2).max(80),
        degreeName: z.string().min(2).max(120),
        idempotencyKey: z.string().min(8).max(80),
      })
      .parse(raw),
  )
  .handler(async ({ context, data }) => {
    const ws = await workspaceFor(context.userId);
    const sql = await getSql();
    const replay = await sql<{ opaque_ref: string; id: string }>`
      select opaque_ref, id from credentials
      where tenant_id = ${ws.tenantId} and idempotency_key = ${data.idempotencyKey}`;
    if (replay[0]) return { ref: replay[0].opaque_ref, id: replay[0].id, replayed: true };

    const secrets = await sql<{ secret_key_hex: string }>`
      select secret_key_hex from key_secrets where tenant_id = ${ws.tenantId} and did = ${ws.issuerDid} and status = 'ACTIVE'`;
    const sealed = secrets[0]?.secret_key_hex;
    if (!sealed) throw new Error("Signing key is not available");
    const secretKey = decodeSecretKeyHex(openSecret(sealed));

    const lists = await sql<{ id: string; encoded_list: string; next_index: number }>`
      select id, encoded_list, next_index from status_lists where issuer_id = ${ws.issuerId} limit 1`;
    const list = lists[0];
    if (!list) throw new Error("Status list missing");
    const index = Number(list.next_index);
    const credId = `urn:uuid:${crypto.randomUUID()}`;
    const issuedAt = new Date().toISOString();
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
    inspectBytes(pdf);
    const documentHash = sha256Bytes(pdf).prefixed;
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
    const docId = newId("doc");
    const ref = opaqueRef();
    await sql`
      insert into documents (id, tenant_id, issuer_id, object_name, mime, byte_length, hash_algorithm, hash, status, content_b64)
      values (
        ${docId}, ${ws.tenantId}, ${ws.issuerId}, ${`${ref}.pdf`}, ${"application/pdf"},
        ${pdf.byteLength}, ${"sha256"}, ${documentHash}, ${"ISSUED"}, ${Buffer.from(pdf).toString("base64")}
      )`;
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
    const sql = await getSql();
    return sql<{
      did: string;
      public_key_multibase: string;
      created_at: string;
    }>`
      select did, public_key_multibase, created_at::text as created_at
      from dids where tenant_id = ${ws.tenantId}`;
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
