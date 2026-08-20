import { getSql } from "@/lib/db";
import {
  encodeDidKey,
  generateEd25519KeyPair,
  publicKeyMultibase,
  didDocument,
  encodeSecretKeyHex,
} from "@/lib/crypto/ed25519";
import { sha256Bytes } from "@/lib/crypto/hash";
import { issueCredential, credentialHash } from "@/lib/credentials/issue";
import { emptyStatusList, encodeStatusList, setBit } from "@/lib/credentials/status-list";
import { renderDiplomaPdf, tamperOneByte } from "@/lib/documents/diploma";
import { getLedger, audit } from "./runtime";
import { DEMO } from "./ids";
import { sealSecret } from "./seal";

const globalSeed = globalThis as typeof globalThis & { __matrixlySeed__?: Promise<void> };

export async function ensureDemoSeed(): Promise<void> {
  globalSeed.__matrixlySeed__ ??= (async () => {
    const sql = await getSql();
    const existing = await sql<{ id: string }>`select id from credentials where opaque_ref = ${DEMO.validRef}`;
    if (existing.length) return;
    const tenant = await sql<{ id: string }>`select id from tenants where id = ${DEMO.tenantId}`;
    if (tenant.length && !existing.length) {
      await sql`delete from verification_requests`;
      await sql`delete from audit_events where tenant_id = ${DEMO.tenantId}`;
      await sql`delete from ledger_blocks`;
      await sql`delete from credentials where tenant_id = ${DEMO.tenantId}`;
      await sql`delete from documents where tenant_id = ${DEMO.tenantId}`;
      await sql`delete from status_lists where tenant_id = ${DEMO.tenantId}`;
      await sql`delete from key_secrets where tenant_id = ${DEMO.tenantId}`;
      await sql`delete from dids where tenant_id = ${DEMO.tenantId}`;
      await sql`delete from issuers where tenant_id = ${DEMO.tenantId}`;
      await sql`delete from organizations where tenant_id = ${DEMO.tenantId}`;
      await sql`delete from memberships where tenant_id = ${DEMO.tenantId}`;
      await sql`delete from tenants where id = ${DEMO.tenantId}`;
    }
    await seedDemo();
  })().catch((err) => {
    globalSeed.__matrixlySeed__ = undefined;
    throw err;
  });
  return globalSeed.__matrixlySeed__;
}

async function seedDemo(): Promise<void> {
  const sql = await getSql();
  const keys = generateEd25519KeyPair();
  const did = encodeDidKey(keys.publicKey);
  const sealed = sealSecret(encodeSecretKeyHex(keys.secretKey));
  const issued = "2026-05-16T00:00:00.000Z";

  await sql`
    insert into tenants (id, slug, name, kind)
    values (${DEMO.tenantId}, ${"global-university"}, ${"Global University"}, ${"PLATFORM_DEMO"})`;
  await sql`
    insert into organizations (id, tenant_id, name, org_type, status)
    values (${DEMO.orgId}, ${DEMO.tenantId}, ${"Global University"}, ${"UNIVERSITY"}, ${"ACTIVE"})`;
  await sql`
    insert into issuers (id, tenant_id, organization_id, name, did, status)
    values (${DEMO.issuerId}, ${DEMO.tenantId}, ${DEMO.orgId}, ${"Office of the Registrar"}, ${did}, ${"ACTIVE"})`;
  await sql`
    insert into dids (id, tenant_id, did, document_json, public_key_multibase)
    values (
      ${"did_demo_registrar"},
      ${DEMO.tenantId},
      ${did},
      ${JSON.stringify(didDocument(did, keys.publicKey))},
      ${publicKeyMultibase(keys.publicKey)}
    )`;
  await sql`
    insert into key_secrets (id, tenant_id, did, secret_key_hex, status)
    values (${"key_demo_registrar"}, ${DEMO.tenantId}, ${did}, ${sealed}, ${"ACTIVE"})`;

  const ledger = await getLedger();
  await ledger.registerIssuer({
    issuerId: did,
    issuerDid: did,
    name: "Office of the Registrar, Global University",
    status: "ACTIVE",
    publicKeyMultibase: publicKeyMultibase(keys.publicKey),
  });

  let statusBits = emptyStatusList();
  const validPdf = await renderDiplomaPdf({
    university: "Global University",
    holder: "Alex Rivera",
    degree: "Bachelor of Computer Science",
    issued: "16 May 2026",
    credentialId: "urn:uuid:demo-valid-bcs",
  });
  const validHash = sha256Bytes(validPdf).prefixed;
  const validCred = issueCredential({
    credentialId: "urn:uuid:demo-valid-bcs",
    issuerDid: did,
    issuerName: "Office of the Registrar, Global University",
    subjectName: "Alex Rivera",
    degreeName: "Bachelor of Computer Science",
    validFrom: issued,
    documentHash: validHash,
    statusListCredentialId: DEMO.statusListId,
    statusListIndex: 0,
    secretKey: keys.secretKey,
  });

  const revokedPdf = await renderDiplomaPdf({
    university: "Global University",
    holder: "Jordan Hale",
    degree: "Bachelor of Computer Science",
    issued: "16 May 2026",
    credentialId: "urn:uuid:demo-revoked-bcs",
  });
  const revokedHash = sha256Bytes(revokedPdf).prefixed;
  const revokedCred = issueCredential({
    credentialId: "urn:uuid:demo-revoked-bcs",
    issuerDid: did,
    issuerName: "Office of the Registrar, Global University",
    subjectName: "Jordan Hale",
    degreeName: "Bachelor of Computer Science",
    validFrom: issued,
    documentHash: revokedHash,
    statusListCredentialId: DEMO.statusListId,
    statusListIndex: 1,
    secretKey: keys.secretKey,
  });
  statusBits = setBit(statusBits, 1, true);

  const expiredPdf = await renderDiplomaPdf({
    university: "Global University",
    holder: "Sam Okonkwo",
    degree: "Bachelor of Computer Science",
    issued: "12 June 2020",
    credentialId: "urn:uuid:demo-expired-bcs",
  });
  const expiredHash = sha256Bytes(expiredPdf).prefixed;
  const expiredCred = issueCredential({
    credentialId: "urn:uuid:demo-expired-bcs",
    issuerDid: did,
    issuerName: "Office of the Registrar, Global University",
    subjectName: "Sam Okonkwo",
    degreeName: "Bachelor of Computer Science",
    validFrom: "2020-06-12T00:00:00.000Z",
    validUntil: "2021-06-12T00:00:00.000Z",
    documentHash: expiredHash,
    statusListCredentialId: DEMO.statusListId,
    statusListIndex: 2,
    secretKey: keys.secretKey,
  });

  const tampered = tamperOneByte(validPdf);

  async function persist(input: {
    id: string;
    ref: string;
    holder: string;
    pdf: Uint8Array;
    hash: string;
    credential: ReturnType<typeof issueCredential>;
    status: string;
    validFrom: string;
    validUntil?: string;
    index: number;
    revokedAt?: string;
  }) {
    const docId = `doc_${input.ref.replaceAll("-", "_")}`;
    await sql`
      insert into documents (id, tenant_id, issuer_id, object_name, mime, byte_length, hash_algorithm, hash, status, content_b64)
      values (
        ${docId},
        ${DEMO.tenantId},
        ${DEMO.issuerId},
        ${`${input.ref}.pdf`},
        ${"application/pdf"},
        ${input.pdf.byteLength},
        ${"sha256"},
        ${input.hash},
        ${"ISSUED"},
        ${Buffer.from(input.pdf).toString("base64")}
      )`;
    await sql`
      insert into credentials (
        id, tenant_id, issuer_id, document_id, opaque_ref, holder_name, degree_name,
        credential_json, credential_hash, document_hash, status, valid_from, valid_until,
        status_list_index, idempotency_key, issued_at, revoked_at
      ) values (
        ${input.credential.id},
        ${DEMO.tenantId},
        ${DEMO.issuerId},
        ${docId},
        ${input.ref},
        ${input.holder},
        ${"Bachelor of Computer Science"},
        ${JSON.stringify(input.credential)},
        ${credentialHash(input.credential)},
        ${input.hash},
        ${input.status},
        ${input.validFrom},
        ${input.validUntil ?? null},
        ${input.index},
        ${`seed:${input.ref}`},
        ${input.validFrom},
        ${input.revokedAt ?? null}
      )`;
    await ledger.registerDocumentAnchor({
      documentHash: input.hash,
      credentialId: input.credential.id,
      issuerDid: did,
    });
    await ledger.registerCredential({
      credentialId: input.credential.id,
      credentialHash: credentialHash(input.credential),
      documentHash: input.hash,
      issuerId: did,
      issuerDid: did,
      status: input.status as "ACTIVE" | "REVOKED" | "EXPIRED",
      issuedAt: input.validFrom,
      expiresAt: input.validUntil,
      version: 1,
    });
    if (input.status === "REVOKED") {
      await ledger.setCredentialStatus({
        credentialId: input.credential.id,
        status: "REVOKED",
        reason: "Disciplinary action",
        at: "2026-07-01T00:00:00.000Z",
      });
    }
  }

  await persist({
    id: validCred.id,
    ref: DEMO.validRef,
    holder: "Alex Rivera",
    pdf: validPdf,
    hash: validHash,
    credential: validCred,
    status: "ACTIVE",
    validFrom: issued,
    index: 0,
  });
  await persist({
    id: revokedCred.id,
    ref: DEMO.revokedRef,
    holder: "Jordan Hale",
    pdf: revokedPdf,
    hash: revokedHash,
    credential: revokedCred,
    status: "REVOKED",
    validFrom: issued,
    index: 1,
    revokedAt: "2026-07-01T00:00:00.000Z",
  });
  await persist({
    id: expiredCred.id,
    ref: DEMO.expiredRef,
    holder: "Sam Okonkwo",
    pdf: expiredPdf,
    hash: expiredHash,
    credential: expiredCred,
    status: "EXPIRED",
    validFrom: "2020-06-12T00:00:00.000Z",
    validUntil: "2021-06-12T00:00:00.000Z",
    index: 2,
  });

  await sql`
    insert into documents (id, tenant_id, issuer_id, object_name, mime, byte_length, hash_algorithm, hash, status, content_b64)
    values (
      ${DEMO.tamperedDocId},
      ${DEMO.tenantId},
      ${DEMO.issuerId},
      ${"demo-tampered.pdf"},
      ${"application/pdf"},
      ${tampered.byteLength},
      ${"sha256"},
      ${sha256Bytes(tampered).prefixed},
      ${"HASHED"},
      ${Buffer.from(tampered).toString("base64")}
    )`;

  await sql`
    insert into status_lists (id, tenant_id, issuer_id, encoded_list, next_index)
    values (${DEMO.statusListId}, ${DEMO.tenantId}, ${DEMO.issuerId}, ${encodeStatusList(statusBits)}, ${3})`;

  await audit({
    tenantId: DEMO.tenantId,
    action: "demo.seeded",
    resourceType: "tenant",
    resourceId: DEMO.tenantId,
    metadata: { issuerDid: did },
  });
}
