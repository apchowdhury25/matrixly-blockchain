import assert from "node:assert/strict";
import { test } from "node:test";
import { inspectBytes, MAX_UPLOAD_BYTES } from "../crypto/inspect";
import { sha256Bytes } from "../crypto/hash";
import { issueCredential, credentialHash } from "../credentials/issue";
import { statusListForIssuer } from "../credentials/status-list-credential";
import { HashChainLedgerAdapter, MemoryLedgerStore } from "../ledger/hash-chain";
import { verifyCredential } from "../verification/pipeline";
import { createIssuerIdentity } from "../identity/keys";
import { tamperOneByte } from "./diploma";
import { buildEvidence } from "./evidence";

const seal = (hex: string) => `sealed:${hex}`;

test("inspection trusts magic bytes, not filenames", () => {
  const pdf = inspectBytes(new TextEncoder().encode("%PDF-1.7\n% named.exe"));
  assert.equal(pdf.kind, "pdf");
  assert.equal(pdf.mime, "application/pdf");
});

test("ZIP and MZ executables are rejected", () => {
  assert.throws(() => inspectBytes(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0])), /Archive/);
  assert.throws(() => inspectBytes(new TextEncoder().encode("MZ executable")), /Archive and executable/);
  assert.throws(() => inspectBytes(new Uint8Array()), /Empty/);
});

test("oversize uploads are rejected", () => {
  assert.throws(() => inspectBytes(new Uint8Array(MAX_UPLOAD_BYTES + 1)), /limit/);
});

test("evidence hash is SHA-256 of exact bytes and ignores a claimed name", () => {
  const bytes = new TextEncoder().encode("%PDF-1.7 diploma-bytes");
  const built = buildEvidence(bytes, "UPLOADED");
  assert.equal(built.evidence.hash, sha256Bytes(bytes).prefixed);
  assert.equal(built.evidence.origin, "UPLOADED");
  assert.equal(JSON.stringify(built.evidence).includes("payroll"), false);
  const mutated = tamperOneByte(bytes);
  assert.notEqual(buildEvidence(mutated, "UPLOADED").evidence.hash, built.evidence.hash);
});

test("same bytes produce the same evidence hash (dedup key)", () => {
  const bytes = new TextEncoder().encode("%PDF-1.7 same");
  const a = buildEvidence(bytes, "GENERATED");
  const b = buildEvidence(bytes, "UPLOADED");
  assert.equal(a.evidence.hash, b.evidence.hash);
});

test("ledger document anchors store the hash, never the original bytes", async () => {
  const identity = createIssuerIdentity(seal);
  const ledger = new HashChainLedgerAdapter(new MemoryLedgerStore());
  await ledger.registerIssuer({
    issuerId: identity.did,
    issuerDid: identity.did,
    name: "Registrar",
    status: "ACTIVE",
    publicKeyMultibase: identity.publicKeyMultibase,
  });
  const bytes = new TextEncoder().encode("%PDF-1.7 confidential-holder-name");
  const built = buildEvidence(bytes, "UPLOADED");
  const credential = issueCredential({
    credentialId: "urn:uuid:doc-phase",
    issuerDid: identity.did,
    issuerName: "Registrar",
    subjectName: "Alex Rivera",
    degreeName: "Bachelor of Computer Science",
    validFrom: "2026-08-21T00:00:00.000Z",
    documentHash: built.evidence.hash,
    statusListCredentialId: "https://trust.matrixly.ai/status/demo",
    statusListIndex: 0,
    secretKey: identity.keys.secretKey,
  });
  await ledger.registerDocumentAnchor({
    documentHash: built.evidence.hash,
    credentialId: credential.id,
    issuerDid: identity.did,
  });
  await ledger.registerCredential({
    credentialId: credential.id,
    credentialHash: credentialHash(credential),
    documentHash: built.evidence.hash,
    issuerId: identity.did,
    issuerDid: identity.did,
    status: "ACTIVE",
    issuedAt: "2026-08-21T00:00:00.000Z",
    version: 1,
  });
  const serialized = JSON.stringify(await ledger.listBlocks());
  assert.equal(serialized.includes("confidential-holder-name"), false);
  assert.equal(serialized.includes("%PDF"), false);
  assert.equal(serialized.includes(built.evidence.hash), true);

  const slc = statusListForIssuer({ issuerDid: identity.did, secretKey: identity.keys.secretKey });
  const ok = await verifyCredential({ credential, documentBytes: bytes, statusListCredential: slc }, ledger);
  assert.equal(ok.status, "VALID");
  const bad = await verifyCredential(
    { credential, documentBytes: tamperOneByte(bytes), statusListCredential: slc },
    ledger,
  );
  assert.equal(bad.documentIntegrityValid, false);
  assert.equal(bad.status, "INVALID");
});

test("document anchor registration is idempotent by hash", async () => {
  const ledger = new HashChainLedgerAdapter(new MemoryLedgerStore());
  const rec = {
    documentHash: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    issuerDid: "did:key:z",
  };
  const first = await ledger.registerDocumentAnchor(rec);
  const second = await ledger.registerDocumentAnchor(rec);
  assert.equal(second.blockHash, first.blockHash);
  const chain = await ledger.verifyChain();
  assert.equal(chain.length, 1);
});
