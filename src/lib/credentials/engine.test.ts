import assert from "node:assert/strict";
import { test } from "node:test";
import {
  generateEd25519KeyPair,
  encodeDidKey,
  verificationMethodId,
  verifyDocumentProof,
} from "../crypto/ed25519";
import { sha256Bytes } from "../crypto/hash";
import { HashChainLedgerAdapter, MemoryLedgerStore } from "../ledger/hash-chain";
import { verifyCredential } from "../verification/pipeline";
import { issueCredential, credentialHash } from "./issue";
import { emptyStatusList, encodeStatusList } from "./status-list";
import { statusListForIssuer } from "./status-list-credential";
import { tamperOneByte } from "../documents/diploma";
import { publishedSchemaRecord } from "../schema/anchor";

async function setupIssuer() {
  const keys = generateEd25519KeyPair();
  const did = encodeDidKey(keys.publicKey);
  const store = new MemoryLedgerStore();
  const ledger = new HashChainLedgerAdapter(store);
  const statusListCredential = statusListForIssuer({ issuerDid: did, secretKey: keys.secretKey });
  await ledger.registerSchema(publishedSchemaRecord());
  return { keys, did, ledger, statusListCredential };
}

test("TEST A: one-byte document mutation fails integrity", async () => {
  const { keys, did, ledger, statusListCredential } = await setupIssuer();
  await ledger.registerIssuer({
    issuerId: did,
    issuerDid: did,
    name: "Global University",
    status: "ACTIVE",
    publicKeyMultibase: did.slice("did:key:".length),
  });
  const original = new TextEncoder().encode("%PDF-1.7 original diploma bytes");
  const documentHash = sha256Bytes(original).prefixed;
  const credential = issueCredential({
    credentialId: "urn:uuid:test-a",
    issuerDid: did,
    issuerName: "Global University",
    subjectName: "Alex Rivera",
    degreeName: "Bachelor of Computer Science",
    validFrom: "2026-08-20T00:00:00.000Z",
    documentHash,
    statusListCredentialId: "https://trust.matrixly.ai/status/demo",
    statusListIndex: 0,
    secretKey: keys.secretKey,
  });
  await ledger.registerDocumentAnchor({ documentHash, credentialId: credential.id, issuerDid: did });
  await ledger.registerCredential({
    credentialId: credential.id,
    credentialHash: credentialHash(credential),
    documentHash,
    issuerId: did,
    issuerDid: did,
    status: "ACTIVE",
    issuedAt: "2026-08-20T00:00:00.000Z",
    version: 1,
  });
  const ok = await verifyCredential({ credential, documentBytes: original, statusListCredential }, ledger);
  assert.equal(ok.status, "VALID");
  const mutated = tamperOneByte(original);
  const bad = await verifyCredential({ credential, documentBytes: mutated, statusListCredential }, ledger);
  assert.equal(bad.documentIntegrityValid, false);
  assert.equal(bad.verified, false);
  assert.equal(bad.status, "INVALID");
});

test("TEST B: modified claim fails signature", async () => {
  const { keys, did, ledger, statusListCredential } = await setupIssuer();
  await ledger.registerIssuer({
    issuerId: did,
    issuerDid: did,
    name: "Global University",
    status: "ACTIVE",
    publicKeyMultibase: did.slice("did:key:".length),
  });
  const documentHash = sha256Bytes(new TextEncoder().encode("doc")).prefixed;
  const credential = issueCredential({
    credentialId: "urn:uuid:test-b",
    issuerDid: did,
    issuerName: "Global University",
    subjectName: "Alex Rivera",
    degreeName: "Bachelor of Computer Science",
    validFrom: "2026-08-20T00:00:00.000Z",
    documentHash,
    statusListCredentialId: "https://trust.matrixly.ai/status/demo",
    statusListIndex: 0,
    secretKey: keys.secretKey,
  });
  await ledger.registerDocumentAnchor({ documentHash, issuerDid: did });
  await ledger.registerCredential({
    credentialId: credential.id,
    credentialHash: credentialHash(credential),
    documentHash,
    issuerId: did,
    issuerDid: did,
    status: "ACTIVE",
    issuedAt: "2026-08-20T00:00:00.000Z",
    version: 1,
  });
  const tampered = structuredClone(credential) as typeof credential;
  (tampered.credentialSubject as { name: string }).name = "Attacker";
  const proof = verifyDocumentProof(tampered, keys.publicKey);
  assert.equal(proof.valid, false);
  const result = await verifyCredential({ credential: tampered, statusListCredential }, ledger);
  assert.equal(result.signatureValid, false);
  assert.equal(result.verified, false);
});

test("TEST C: unknown issuer fails", async () => {
  const { did, ledger } = await setupIssuer();
  const other = generateEd25519KeyPair();
  const otherDid = encodeDidKey(other.publicKey);
  const documentHash = sha256Bytes(new TextEncoder().encode("doc")).prefixed;
  const credential = issueCredential({
    credentialId: "urn:uuid:test-c",
    issuerDid: otherDid,
    issuerName: "Forged College",
    subjectName: "Alex Rivera",
    degreeName: "Bachelor of Computer Science",
    validFrom: "2026-08-20T00:00:00.000Z",
    documentHash,
    statusListCredentialId: "https://trust.matrixly.ai/status/demo",
    statusListIndex: 0,
    secretKey: other.secretKey,
  });
  await ledger.registerIssuer({
    issuerId: did,
    issuerDid: did,
    name: "Global University",
    status: "ACTIVE",
    publicKeyMultibase: did.slice("did:key:".length),
  });
  const result = await verifyCredential({ credential }, ledger);
  assert.equal(result.issuerVerified, false);
  assert.equal(result.verified, false);
});

test("TEST D: revoked credential returns REVOKED", async () => {
  const { keys, did, ledger } = await setupIssuer();
  await ledger.registerIssuer({
    issuerId: did,
    issuerDid: did,
    name: "Global University",
    status: "ACTIVE",
    publicKeyMultibase: did.slice("did:key:".length),
  });
  const documentHash = sha256Bytes(new TextEncoder().encode("doc")).prefixed;
  const credential = issueCredential({
    credentialId: "urn:uuid:test-d",
    issuerDid: did,
    issuerName: "Global University",
    subjectName: "Alex Rivera",
    degreeName: "Bachelor of Computer Science",
    validFrom: "2026-08-20T00:00:00.000Z",
    documentHash,
    statusListCredentialId: "https://trust.matrixly.ai/status/demo",
    statusListIndex: 1,
    secretKey: keys.secretKey,
  });
  await ledger.registerDocumentAnchor({ documentHash, issuerDid: did });
  await ledger.registerCredential({
    credentialId: credential.id,
    credentialHash: credentialHash(credential),
    documentHash,
    issuerId: did,
    issuerDid: did,
    status: "ACTIVE",
    issuedAt: "2026-08-20T00:00:00.000Z",
    version: 1,
  });
  await ledger.setCredentialStatus({
    credentialId: credential.id,
    status: "REVOKED",
    reason: "Student request",
    at: "2026-08-20T12:00:00.000Z",
  });
  const revokedList = statusListForIssuer({
    issuerDid: did,
    secretKey: keys.secretKey,
    revokedIndexes: [1],
  });
  const result = await verifyCredential({ credential, statusListCredential: revokedList }, ledger);
  assert.equal(result.revoked, true);
  assert.equal(result.status, "REVOKED");
  assert.equal(result.verified, false);
  assert.equal(result.statusListValid, true);
});

test("TEST D2: signed status list bit revokes even when the ledger row is still ACTIVE", async () => {
  const { keys, did, ledger } = await setupIssuer();
  await ledger.registerIssuer({
    issuerId: did,
    issuerDid: did,
    name: "Global University",
    status: "ACTIVE",
    publicKeyMultibase: did.slice("did:key:".length),
  });
  const documentHash = sha256Bytes(new TextEncoder().encode("doc")).prefixed;
  const credential = issueCredential({
    credentialId: "urn:uuid:test-d2",
    issuerDid: did,
    issuerName: "Global University",
    subjectName: "Alex Rivera",
    degreeName: "Bachelor of Computer Science",
    validFrom: "2026-08-20T00:00:00.000Z",
    documentHash,
    statusListCredentialId: "https://trust.matrixly.ai/status/demo",
    statusListIndex: 4,
    secretKey: keys.secretKey,
  });
  await ledger.registerDocumentAnchor({ documentHash, issuerDid: did });
  await ledger.registerCredential({
    credentialId: credential.id,
    credentialHash: credentialHash(credential),
    documentHash,
    issuerId: did,
    issuerDid: did,
    status: "ACTIVE",
    issuedAt: "2026-08-20T00:00:00.000Z",
    version: 1,
  });
  const slc = statusListForIssuer({ issuerDid: did, secretKey: keys.secretKey, revokedIndexes: [4] });
  const result = await verifyCredential({ credential, statusListCredential: slc }, ledger);
  assert.equal(result.statusListValid, true);
  assert.equal(result.revoked, true);
  assert.equal(result.status, "REVOKED");
});

test("TEST D3: unsigned bitstring is not enough under the default policy", async () => {
  const { keys, did, ledger } = await setupIssuer();
  await ledger.registerIssuer({
    issuerId: did,
    issuerDid: did,
    name: "Global University",
    status: "ACTIVE",
    publicKeyMultibase: did.slice("did:key:".length),
  });
  const documentHash = sha256Bytes(new TextEncoder().encode("doc")).prefixed;
  const credential = issueCredential({
    credentialId: "urn:uuid:test-d3",
    issuerDid: did,
    issuerName: "Global University",
    subjectName: "Alex Rivera",
    degreeName: "Bachelor of Computer Science",
    validFrom: "2026-08-20T00:00:00.000Z",
    documentHash,
    statusListCredentialId: "https://trust.matrixly.ai/status/demo",
    statusListIndex: 0,
    secretKey: keys.secretKey,
  });
  await ledger.registerDocumentAnchor({ documentHash, issuerDid: did });
  await ledger.registerCredential({
    credentialId: credential.id,
    credentialHash: credentialHash(credential),
    documentHash,
    issuerId: did,
    issuerDid: did,
    status: "ACTIVE",
    issuedAt: "2026-08-20T00:00:00.000Z",
    version: 1,
  });
  const unsigned = encodeStatusList(emptyStatusList());
  const result = await verifyCredential({ credential, encodedStatusList: unsigned }, ledger);
  assert.equal(result.statusListValid, false);
  assert.equal(result.status, "INVALID");
});

test("TEST E: expired credential returns EXPIRED", async () => {
  const { keys, did, ledger, statusListCredential } = await setupIssuer();
  await ledger.registerIssuer({
    issuerId: did,
    issuerDid: did,
    name: "Global University",
    status: "ACTIVE",
    publicKeyMultibase: did.slice("did:key:".length),
  });
  const documentHash = sha256Bytes(new TextEncoder().encode("doc")).prefixed;
  const credential = issueCredential({
    credentialId: "urn:uuid:test-e",
    issuerDid: did,
    issuerName: "Global University",
    subjectName: "Alex Rivera",
    degreeName: "Bachelor of Computer Science",
    validFrom: "2020-01-01T00:00:00.000Z",
    validUntil: "2021-01-01T00:00:00.000Z",
    documentHash,
    statusListCredentialId: "https://trust.matrixly.ai/status/demo",
    statusListIndex: 0,
    secretKey: keys.secretKey,
  });
  await ledger.registerDocumentAnchor({ documentHash, issuerDid: did });
  await ledger.registerCredential({
    credentialId: credential.id,
    credentialHash: credentialHash(credential),
    documentHash,
    issuerId: did,
    issuerDid: did,
    status: "ACTIVE",
    issuedAt: "2020-01-01T00:00:00.000Z",
    expiresAt: "2021-01-01T00:00:00.000Z",
    version: 1,
  });
  const result = await verifyCredential(
    { credential, now: new Date("2026-08-20T00:00:00.000Z"), statusListCredential },
    ledger,
  );
  assert.equal(result.expired, true);
  assert.equal(result.status, "EXPIRED");
});

test("verification method id is bound to did:key", () => {
  const keys = generateEd25519KeyPair();
  const did = encodeDidKey(keys.publicKey);
  assert.equal(verificationMethodId(did).startsWith(did + "#z"), true);
});

test("status list is resolved from credentialStatus URL via loader", async () => {
  const { keys, did, ledger, statusListCredential } = await setupIssuer();
  await ledger.registerIssuer({
    issuerId: did,
    issuerDid: did,
    name: "Global University",
    status: "ACTIVE",
    publicKeyMultibase: did.slice("did:key:".length),
  });
  const documentHash = sha256Bytes(new TextEncoder().encode("doc-url")).prefixed;
  const statusUrl = "https://trust.matrixly.ai/credentials/status/demo";
  const credential = issueCredential({
    credentialId: "urn:uuid:test-status-url",
    issuerDid: did,
    issuerName: "Global University",
    subjectName: "Alex Rivera",
    degreeName: "Bachelor of Computer Science",
    validFrom: "2026-08-20T00:00:00.000Z",
    documentHash,
    statusListCredentialId: statusUrl,
    statusListIndex: 0,
    secretKey: keys.secretKey,
  });
  await ledger.registerDocumentAnchor({ documentHash, issuerDid: did, credentialId: credential.id });
  await ledger.registerCredential({
    credentialId: credential.id,
    credentialHash: credentialHash(credential),
    documentHash,
    issuerId: did,
    issuerDid: did,
    status: "ACTIVE",
    issuedAt: "2026-08-20T00:00:00.000Z",
    version: 1,
  });
  const viaUrl = await verifyCredential(
    {
      credential,
      statusListResolve: { loader: async (url) => (url === statusUrl ? (statusListCredential as Record<string, unknown>) : null) },
    },
    ledger,
  );
  assert.equal(viaUrl.status, "VALID");
  assert.equal(viaUrl.statusListValid, true);
  const missing = await verifyCredential({ credential }, ledger);
  assert.equal(missing.status, "INVALID");
  assert.equal(missing.statusListValid, false);
});

test("unknown credentialSchema id never returns VALID", async () => {
  const { keys, did, ledger, statusListCredential } = await setupIssuer();
  await ledger.registerIssuer({
    issuerId: did,
    issuerDid: did,
    name: "Global University",
    status: "ACTIVE",
    publicKeyMultibase: did.slice("did:key:".length),
  });
  const documentHash = sha256Bytes(new TextEncoder().encode("doc-schema")).prefixed;
  const credential = issueCredential({
    credentialId: "urn:uuid:test-schema",
    issuerDid: did,
    issuerName: "Global University",
    subjectName: "Alex Rivera",
    degreeName: "Bachelor of Computer Science",
    validFrom: "2026-08-20T00:00:00.000Z",
    documentHash,
    statusListCredentialId: "https://trust.matrixly.ai/credentials/status/demo",
    statusListIndex: 0,
    secretKey: keys.secretKey,
    schemaId: "https://evil.example/schema.json",
  });
  const result = await verifyCredential({ credential, statusListCredential }, ledger);
  assert.equal(result.status, "INVALID");
  assert.match(result.reasons.join(" "), /Unknown credentialSchema/);
});

test("credentialSchema must be anchored on the ledger with the published hash", async () => {
  const keys = generateEd25519KeyPair();
  const did = encodeDidKey(keys.publicKey);
  const ledger = new HashChainLedgerAdapter(new MemoryLedgerStore());
  const statusListCredential = statusListForIssuer({ issuerDid: did, secretKey: keys.secretKey });
  await ledger.registerIssuer({
    issuerId: did,
    issuerDid: did,
    name: "Global University",
    status: "ACTIVE",
    publicKeyMultibase: did.slice("did:key:".length),
  });
  const documentHash = sha256Bytes(new TextEncoder().encode("doc-schema-ledger")).prefixed;
  const credential = issueCredential({
    credentialId: "urn:uuid:test-schema-ledger",
    issuerDid: did,
    issuerName: "Global University",
    subjectName: "Alex Rivera",
    degreeName: "Bachelor of Computer Science",
    validFrom: "2026-08-20T00:00:00.000Z",
    documentHash,
    statusListCredentialId: "https://trust.matrixly.ai/credentials/status/demo",
    statusListIndex: 0,
    secretKey: keys.secretKey,
  });
  await ledger.registerDocumentAnchor({ documentHash, credentialId: credential.id, issuerDid: did });
  await ledger.registerCredential({
    credentialId: credential.id,
    credentialHash: credentialHash(credential),
    documentHash,
    issuerId: did,
    issuerDid: did,
    status: "ACTIVE",
    issuedAt: "2026-08-20T00:00:00.000Z",
    version: 1,
  });
  const missing = await verifyCredential({ credential, statusListCredential }, ledger);
  assert.equal(missing.schemaAnchored, false);
  assert.equal(missing.status, "INVALID");
  await ledger.registerSchema({
    schemaId: publishedSchemaRecord().schemaId,
    schemaHash: "sha256:" + "ab".repeat(32),
    schemaType: "JsonSchema",
    status: "ACTIVE",
  });
  const wrong = await verifyCredential({ credential, statusListCredential }, ledger);
  assert.equal(wrong.schemaAnchored, false);
  assert.equal(wrong.status, "INVALID");
});
