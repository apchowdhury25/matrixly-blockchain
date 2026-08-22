import { getSql } from "@/lib/db";
import {
  encodeDidKey,
  generateEd25519KeyPair,
  publicKeyMultibase,
  didDocument,
  encodeSecretKeyHex,
  decodeSecretKeyHex,
} from "@/lib/crypto/ed25519";
import { sha256Bytes } from "@/lib/crypto/hash";
import { issueCredential, credentialHash } from "@/lib/credentials/issue";
import { emptyStatusList, encodeStatusList, setBit } from "@/lib/credentials/status-list";
import { issueStatusListCredential } from "@/lib/credentials/status-list-credential";
import { renderDiplomaPdf, tamperOneByte } from "@/lib/documents/diploma";
import { didDocumentHash } from "@/lib/identity/did";
import {
  buildDidWebDocument,
  didWebForTenant,
  verificationMethodForDid,
} from "@/lib/identity/did-web";
import { buildEvidence } from "@/lib/documents/evidence";
import { getLedger, audit } from "./runtime";
import { DEMO } from "./ids";
import { openSecret, sealSecret } from "./seal";
import { hashApiKey } from "@/lib/api/keys";
import { registerPublishedSchema } from "@/lib/schema/anchor";

const globalSeed = globalThis as typeof globalThis & { __matrixlySeed__?: Promise<void> };

export async function ensureDemoSeed(): Promise<void> {
  globalSeed.__matrixlySeed__ ??= (async () => {
    const sql = await getSql();
    const existing = await sql<{ id: string }>`select id from credentials where opaque_ref = ${DEMO.validRef}`;
    if (existing.length) {
      await ensureDemoDelivery();
      await ensureDemoStatusList();
      await ensureDemoApiKey();
      await ensureDemoSchema();
      await ensureDemoDidWeb();
      return;
    }
    const tenant = await sql<{ id: string }>`select id from tenants where id = ${DEMO.tenantId}`;
    if (tenant.length && !existing.length) {
      await sql`delete from presentations where credential_id in (select id from credentials where tenant_id = ${DEMO.tenantId})`;
      await sql`delete from wallet_items where credential_id in (select id from credentials where tenant_id = ${DEMO.tenantId})`;
      await sql`delete from credential_deliveries where tenant_id = ${DEMO.tenantId}`;
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
    await ensureDemoApiKey();
    await ensureDemoDidWeb();
  })().catch((err) => {
    globalSeed.__matrixlySeed__ = undefined;
    throw err;
  });
  return globalSeed.__matrixlySeed__;
}

async function seedDemo(): Promise<void> {
  const sql = await getSql();
  const ledger = await getLedger();
  await registerPublishedSchema(ledger);
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
  const document = didDocument(did, keys.publicKey);
  const documentHash = didDocumentHash(document);
  await sql`
    insert into issuers (id, tenant_id, organization_id, name, did, status)
    values (${DEMO.issuerId}, ${DEMO.tenantId}, ${DEMO.orgId}, ${"Office of the Registrar"}, ${did}, ${"ACTIVE"})`;
  await sql`
    insert into dids (id, tenant_id, did, document_json, public_key_multibase, status, document_hash)
    values (
      ${"did_demo_registrar"},
      ${DEMO.tenantId},
      ${did},
      ${JSON.stringify(document)},
      ${publicKeyMultibase(keys.publicKey)},
      ${"ACTIVE"},
      ${documentHash}
    )`;
  await sql`
    insert into key_secrets (id, tenant_id, did, secret_key_hex, status, public_key_multibase, purpose)
    values (${"key_demo_registrar"}, ${DEMO.tenantId}, ${did}, ${sealed}, ${"ACTIVE"}, ${publicKeyMultibase(keys.publicKey)}, ${"assertionMethod"})`;

  await ledger.registerDid({
    did,
    documentHash,
    publicKeyMultibase: publicKeyMultibase(keys.publicKey),
    status: "ACTIVE",
  });
  await ledger.registerIssuer({
    issuerId: did,
    issuerDid: did,
    name: "Office of the Registrar, Global University",
    status: "ACTIVE",
    publicKeyMultibase: publicKeyMultibase(keys.publicKey),
  });
  await registerPublishedSchema(ledger);

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
    const evidence = buildEvidence(input.pdf, "GENERATED").evidence;
    await sql`
      insert into documents (id, tenant_id, issuer_id, object_name, mime, byte_length, hash_algorithm, hash, status, content_b64, origin, inspected_kind, evidence_json)
      values (
        ${docId},
        ${DEMO.tenantId},
        ${DEMO.issuerId},
        ${evidence.objectName},
        ${evidence.mime},
        ${input.pdf.byteLength},
        ${"sha256"},
        ${input.hash},
        ${"ISSUED"},
        ${Buffer.from(input.pdf).toString("base64")},
        ${"GENERATED"},
        ${evidence.kind},
        ${JSON.stringify(evidence)}
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
      schemaId: "https://trust.matrixly.ai/schemas/university-degree-credential.json",
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
    insert into credential_deliveries (id, credential_id, tenant_id, claim_token, status)
    values (${"dlv_demo_valid"}, ${validCred.id}, ${DEMO.tenantId}, ${DEMO.claimToken}, ${"PENDING"})`;

  const tamperedEvidence = buildEvidence(tampered, "GENERATED").evidence;
  await sql`
    insert into documents (id, tenant_id, issuer_id, object_name, mime, byte_length, hash_algorithm, hash, status, content_b64, origin, inspected_kind, evidence_json)
    values (
      ${DEMO.tamperedDocId},
      ${DEMO.tenantId},
      ${DEMO.issuerId},
      ${tamperedEvidence.objectName},
      ${tamperedEvidence.mime},
      ${tampered.byteLength},
      ${"sha256"},
      ${sha256Bytes(tampered).prefixed},
      ${"HASHED"},
      ${Buffer.from(tampered).toString("base64")},
      ${"GENERATED"},
      ${tamperedEvidence.kind},
      ${JSON.stringify(tamperedEvidence)}
    )`;

  const encodedBits = encodeStatusList(statusBits);
  const slc = issueStatusListCredential({
    credentialId: DEMO.statusListId,
    issuerDid: did,
    issuerName: "Office of the Registrar, Global University",
    encodedList: encodedBits,
    validFrom: issued,
    secretKey: keys.secretKey,
  });
  await sql`
    insert into status_lists (id, tenant_id, issuer_id, encoded_list, next_index, credential_json, credential_hash)
    values (${DEMO.statusListId}, ${DEMO.tenantId}, ${DEMO.issuerId}, ${encodedBits}, ${3}, ${JSON.stringify(slc)}, ${credentialHash(slc)})`;

  await audit({
    tenantId: DEMO.tenantId,
    action: "demo.seeded",
    resourceType: "tenant",
    resourceId: DEMO.tenantId,
    metadata: { issuerDid: did },
  });
}

async function ensureDemoDelivery(): Promise<void> {
  const sql = await getSql();
  const have = await sql<{ id: string }>`
    select id from credential_deliveries where claim_token = ${DEMO.claimToken}`;
  if (have[0]) return;
  const creds = await sql<{ id: string }>`
    select id from credentials where opaque_ref = ${DEMO.validRef}`;
  if (!creds[0]) return;
  await sql`
    insert into credential_deliveries (id, credential_id, tenant_id, claim_token, status)
    values (${"dlv_demo_valid"}, ${creds[0].id}, ${DEMO.tenantId}, ${DEMO.claimToken}, ${"PENDING"})
    on conflict (credential_id) do nothing`;
}

async function ensureDemoStatusList(): Promise<void> {
  const sql = await getSql();
  const lists = await sql<{ id: string; encoded_list: string; credential_json: string | null }>`
    select id, encoded_list, credential_json from status_lists where id = ${DEMO.statusListId}`;
  if (!lists[0] || lists[0].credential_json) return;
  const secrets = await sql<{ secret_key_hex: string; did: string }>`
    select secret_key_hex, did from key_secrets where tenant_id = ${DEMO.tenantId} and status = 'ACTIVE' limit 1`;
  if (!secrets[0]) return;
  const slc = issueStatusListCredential({
    credentialId: lists[0].id,
    issuerDid: secrets[0].did,
    issuerName: "Office of the Registrar, Global University",
    encodedList: lists[0].encoded_list,
    secretKey: decodeSecretKeyHex(openSecret(secrets[0].secret_key_hex)),
  });
  await sql`
    update status_lists
    set credential_json = ${JSON.stringify(slc)}, credential_hash = ${credentialHash(slc)}, updated_at = now()
    where id = ${lists[0].id}`;
}

async function ensureDemoApiKey(): Promise<void> {
  const sql = await getSql();
  const have = await sql<{ id: string }>`select id from verifier_api_keys where id = ${DEMO.apiKeyId}`;
  if (have[0]) return;
  const prefix = DEMO.apiKey.slice(0, 20);
  await sql`
    insert into verifier_api_keys (id, tenant_id, created_by_user_id, name, prefix, secret_hash, status)
    values (
      ${DEMO.apiKeyId},
      ${DEMO.tenantId},
      ${null},
      ${"Demo verifier"},
      ${prefix},
      ${hashApiKey(DEMO.apiKey)},
      ${"ACTIVE"}
    )`;
}

async function ensureDemoDidWeb(): Promise<void> {
  const sql = await getSql();
  const existing = await sql<{ id: string }>`select id from credentials where opaque_ref = ${DEMO.webRef}`;
  if (existing[0]) return;
  const secrets = await sql<{ secret_key_hex: string; did: string; public_key_multibase: string }>`
    select secret_key_hex, did, public_key_multibase from key_secrets
    where tenant_id = ${DEMO.tenantId} and status = ${"ACTIVE"} limit 1`;
  const secret = secrets[0];
  if (!secret) return;
  const docs = await sql<{ id: string; hash: string; content_b64: string }>`
    select d.id, d.hash, d.content_b64 from documents d
    join credentials c on c.document_id = d.id
    where c.opaque_ref = ${DEMO.validRef} limit 1`;
  const doc = docs[0];
  if (!doc) return;
  const webDid = didWebForTenant(DEMO.webSlug, DEMO.webHost);
  const document = buildDidWebDocument({
    did: webDid,
    publicKeyMultibase: secret.public_key_multibase,
    alsoKnownAs: [secret.did],
  });
  const documentHash = didDocumentHash(document);
  const secretKey = decodeSecretKeyHex(openSecret(secret.secret_key_hex));
  const issued = "2026-05-16T00:00:00.000Z";
  const cred = issueCredential({
    credentialId: "urn:uuid:demo-valid-didweb",
    issuerDid: webDid,
    issuerName: "Office of the Registrar, Global University",
    subjectName: "Alex Rivera",
    degreeName: "Bachelor of Computer Science",
    validFrom: issued,
    documentHash: doc.hash,
    statusListCredentialId: DEMO.statusListId,
    statusListIndex: 0,
    secretKey,
    verificationMethod: verificationMethodForDid(webDid, secret.public_key_multibase),
  });
  const ledger = await getLedger();
  await ledger.registerDid({
    did: webDid,
    documentHash,
    publicKeyMultibase: secret.public_key_multibase,
    status: "ACTIVE",
  });
  await ledger.registerIssuer({
    issuerId: webDid,
    issuerDid: webDid,
    name: "Office of the Registrar, Global University",
    status: "ACTIVE",
    publicKeyMultibase: secret.public_key_multibase,
  });
  await sql`
    insert into credentials (
      id, tenant_id, issuer_id, document_id, opaque_ref, holder_name, degree_name,
      credential_json, credential_hash, document_hash, status, valid_from, valid_until,
      status_list_index, idempotency_key, issued_at
    ) values (
      ${cred.id}, ${DEMO.tenantId}, ${DEMO.issuerId}, ${doc.id}, ${DEMO.webRef},
      ${"Alex Rivera"}, ${"Bachelor of Computer Science"},
      ${JSON.stringify(cred)}, ${credentialHash(cred)}, ${doc.hash}, ${"ACTIVE"},
      ${issued}, ${null}, ${0}, ${`seed:${DEMO.webRef}`}, ${issued}
    )
    on conflict (id) do nothing`;
  await ledger.registerDocumentAnchor({
    documentHash: doc.hash,
    credentialId: cred.id,
    issuerDid: webDid,
  });
  await ledger.registerCredential({
    credentialId: cred.id,
    credentialHash: credentialHash(cred),
    documentHash: doc.hash,
    issuerId: webDid,
    issuerDid: webDid,
    schemaId: "https://trust.matrixly.ai/schemas/university-degree-credential.json",
    status: "ACTIVE",
    issuedAt: issued,
    version: 1,
  });
}

async function ensureDemoSchema(): Promise<void> {
  const ledger = await getLedger();
  await registerPublishedSchema(ledger);
}


