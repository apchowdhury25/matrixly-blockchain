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
import { emptyStatusList, encodeStatusList, setBit } from "./status-list";
import { tamperOneByte } from "../documents/diploma";

function setupIssuer() {
  const keys = generateEd25519KeyPair();
  const did = encodeDidKey(keys.publicKey);
  const store = new MemoryLedgerStore();
  const ledger = new HashChainLedgerAdapter(store);
  return { keys, did, ledger };
}

test("TEST A: one-byte document mutation fails integrity", async () => {
  const { keys, did, ledger } = setupIssuer();
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
  const ok = await verifyCredential({ credential, documentBytes: original }, ledger);
  assert.equal(ok.status, "VALID");
  const mutated = tamperOneByte(original);
  const bad = await verifyCredential({ credential, documentBytes: mutated }, ledger);
  assert.equal(bad.documentIntegrityValid, false);
  assert.equal(bad.verified, false);
  assert.equal(bad.status, "INVALID");
});

test("TEST B: modified claim fails signature", async () => {
  const { keys, did, ledger } = setupIssuer();
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
  const result = await verifyCredential({ credential: tampered }, ledger);
  assert.equal(result.signatureValid, false);
  assert.equal(result.verified, false);
});

test("TEST C: unknown issuer fails", async () => {
  const { did, ledger } = setupIssuer();
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
  const { keys, did, ledger } = setupIssuer();
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
  const list = encodeStatusList(setBit(emptyStatusList(), 1, true));
  const result = await verifyCredential({ credential, encodedStatusList: list }, ledger);
  assert.equal(result.revoked, true);
  assert.equal(result.status, "REVOKED");
  assert.equal(result.verified, false);
});

test("TEST E: expired credential returns EXPIRED", async () => {
  const { keys, did, ledger } = setupIssuer();
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
    { credential, now: new Date("2026-08-20T00:00:00.000Z") },
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
