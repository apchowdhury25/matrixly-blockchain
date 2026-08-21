import assert from "node:assert/strict";
import { test } from "node:test";
import {
  encodeDidKey,
  generateEd25519KeyPair,
  verifyDocumentProof,
} from "../crypto/ed25519";
import { sha256Bytes } from "../crypto/hash";
import { issueCredential, credentialHash } from "../credentials/issue";
import { statusListForIssuer } from "../credentials/status-list-credential";
import { HashChainLedgerAdapter, MemoryLedgerStore } from "../ledger/hash-chain";
import { FabricLedgerAdapter } from "../ledger/fabric";
import { verifyCredential } from "../verification/pipeline";
import { didDocumentHash, didKeyFromMultibase, resolveDidKey } from "./did";
import { createIssuerIdentity, assertActiveSigningKey } from "./keys";
import { assertPermission, hasPermission, isRole, permissionMap } from "./roles";

const seal = (hex: string) => `sealed:${hex}`;

test("did:key round-trips and document id matches the identifier", () => {
  const keys = generateEd25519KeyPair();
  const did = encodeDidKey(keys.publicKey);
  const resolved = resolveDidKey(did);
  assert.equal(resolved.ok, true);
  if (!resolved.ok) return;
  assert.equal(resolved.method, "key");
  assert.equal(resolved.document.id, did);
  assert.equal(resolved.verificationMethod.startsWith(did + "#"), true);
  const again = resolveDidKey(didKeyFromMultibase(resolved.publicKeyMultibase));
  assert.equal(again.ok, true);
  if (!again.ok) return;
  assert.equal(again.did, did);
});

test("unsupported and malformed DIDs fail closed", () => {
  assert.equal(resolveDidKey("did:web:example.edu").ok, false);
  assert.equal(resolveDidKey("not-a-did").ok, false);
  assert.equal(resolveDidKey("did:key:z").ok, false);
  assert.equal(resolveDidKey("").ok, false);
});

test("DID document hash is deterministic and changes when the key changes", () => {
  const a = createIssuerIdentity(seal);
  const b = createIssuerIdentity(seal);
  assert.equal(didDocumentHash(a.document), a.documentHash);
  assert.equal(didDocumentHash(a.document), didDocumentHash(a.document));
  assert.notEqual(a.did, b.did);
  assert.notEqual(a.documentHash, b.documentHash);
});

test("RBAC: auditor cannot issue or rotate; admin can", () => {
  assert.equal(isRole("TENANT_ADMIN"), true);
  assert.equal(hasPermission("AUDITOR", "issue"), false);
  assert.equal(hasPermission("AUDITOR", "ingest"), false);
  assert.equal(hasPermission("AUDITOR", "readDocuments"), true);
  assert.equal(hasPermission("AUDITOR", "rotateKeys"), false);
  assert.equal(hasPermission("ISSUER", "issue"), true);
  assert.equal(hasPermission("ISSUER", "rotateKeys"), false);
  assert.equal(hasPermission("AUDITOR", "manageApiKeys"), false);
  assert.equal(hasPermission("TENANT_ADMIN", "manageApiKeys"), true);
  assert.throws(() => assertPermission("AUDITOR", "manageApiKeys"), /Not permitted/);
  assert.doesNotThrow(() => assertPermission("TENANT_ADMIN", "rotateKeys"));
  const map = permissionMap("AUDITOR");
  assert.equal(map.issue, false);
  assert.equal(map.readAudit, true);
  assert.equal(map.manageApiKeys, false);
});

test("only ACTIVE keys may sign", () => {
  assert.doesNotThrow(() => assertActiveSigningKey("ACTIVE"));
  assert.throws(() => assertActiveSigningKey("ROTATED"), /only ACTIVE/);
  assert.throws(() => assertActiveSigningKey("REVOKED"), /only ACTIVE/);
});

test("key rotation: old credential still verifies; new DID signs new credentials", async () => {
  const first = createIssuerIdentity(seal);
  const store = new MemoryLedgerStore();
  const ledger = new HashChainLedgerAdapter(store);
  await ledger.registerDid({
    did: first.did,
    documentHash: first.documentHash,
    publicKeyMultibase: first.publicKeyMultibase,
    status: "ACTIVE",
  });
  await ledger.registerIssuer({
    issuerId: first.did,
    issuerDid: first.did,
    name: "Registrar",
    status: "ACTIVE",
    publicKeyMultibase: first.publicKeyMultibase,
  });

  const original = new TextEncoder().encode("%PDF-1.7 prior-key diploma");
  const documentHash = sha256Bytes(original).prefixed;
  const oldCred = issueCredential({
    credentialId: "urn:uuid:pre-rotate",
    issuerDid: first.did,
    issuerName: "Registrar",
    subjectName: "Alex Rivera",
    degreeName: "Bachelor of Computer Science",
    validFrom: "2026-08-20T00:00:00.000Z",
    documentHash,
    statusListCredentialId: "https://trust.matrixly.ai/status/demo",
    statusListIndex: 0,
    secretKey: first.keys.secretKey,
  });
  await ledger.registerDocumentAnchor({ documentHash, credentialId: oldCred.id, issuerDid: first.did });
  await ledger.registerCredential({
    credentialId: oldCred.id,
    credentialHash: credentialHash(oldCred),
    documentHash,
    issuerId: first.did,
    issuerDid: first.did,
    status: "ACTIVE",
    issuedAt: "2026-08-20T00:00:00.000Z",
    version: 1,
  });

  const second = createIssuerIdentity(seal);
  await ledger.registerDid({
    did: second.did,
    documentHash: second.documentHash,
    publicKeyMultibase: second.publicKeyMultibase,
    status: "ACTIVE",
    controllerDid: first.did,
  });
  await ledger.registerIssuer({
    issuerId: second.did,
    issuerDid: second.did,
    name: "Registrar",
    status: "ACTIVE",
    publicKeyMultibase: second.publicKeyMultibase,
  });

  const oldList = statusListForIssuer({ issuerDid: first.did, secretKey: first.keys.secretKey });
  const oldResult = await verifyCredential(
    { credential: oldCred, documentBytes: original, statusListCredential: oldList },
    ledger,
  );
  assert.equal(oldResult.status, "VALID");
  assert.equal(oldResult.issuerDid, first.did);

  const nextBytes = new TextEncoder().encode("%PDF-1.7 post-rotate diploma");
  const nextHash = sha256Bytes(nextBytes).prefixed;
  const newCred = issueCredential({
    credentialId: "urn:uuid:post-rotate",
    issuerDid: second.did,
    issuerName: "Registrar",
    subjectName: "Alex Rivera",
    degreeName: "Bachelor of Computer Science",
    validFrom: "2026-08-21T00:00:00.000Z",
    documentHash: nextHash,
    statusListCredentialId: "https://trust.matrixly.ai/status/demo",
    statusListIndex: 1,
    secretKey: second.keys.secretKey,
  });
  await ledger.registerDocumentAnchor({
    documentHash: nextHash,
    credentialId: newCred.id,
    issuerDid: second.did,
  });
  await ledger.registerCredential({
    credentialId: newCred.id,
    credentialHash: credentialHash(newCred),
    documentHash: nextHash,
    issuerId: second.did,
    issuerDid: second.did,
    status: "ACTIVE",
    issuedAt: "2026-08-21T00:00:00.000Z",
    version: 1,
  });
  const newList = statusListForIssuer({ issuerDid: second.did, secretKey: second.keys.secretKey });
  const newResult = await verifyCredential(
    { credential: newCred, documentBytes: nextBytes, statusListCredential: newList },
    ledger,
  );
  assert.equal(newResult.status, "VALID");
  assert.equal(newResult.issuerDid, second.did);

  const mixed = verifyDocumentProof(oldCred, second.keys.publicKey);
  assert.equal(mixed.valid, false);
});

test("Fabric adapter refuses DID registration", async () => {
  const fabric = new FabricLedgerAdapter();
  await assert.rejects(() =>
    fabric.registerDid({
      did: "did:key:z",
      documentHash: "sha256:00",
      publicKeyMultibase: "z",
      status: "ACTIVE",
    }),
  );
});
