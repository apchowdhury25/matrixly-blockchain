import assert from "node:assert/strict";
import { test } from "node:test";
import { encodeDidKey, generateEd25519KeyPair } from "../crypto/ed25519";
import { HashChainLedgerAdapter, MemoryLedgerStore } from "./hash-chain";
import { buildBlockInclusionProof, findCredentialBlockIndex } from "./proof";
import { buildLedgerReceipt, verifyLedgerReceipt } from "./receipt";
import { treeHeadFromBlocks } from "./sth";

async function seeded() {
  const keys = generateEd25519KeyPair();
  const did = encodeDidKey(keys.publicKey);
  const ledger = new HashChainLedgerAdapter(new MemoryLedgerStore());
  await ledger.registerIssuer({
    issuerId: did,
    issuerDid: did,
    name: "Global University",
    status: "ACTIVE",
    publicKeyMultibase: did.slice("did:key:".length),
  });
  const credentialHash = "sha256:" + "ab".repeat(32);
  await ledger.registerCredential({
    credentialId: "urn:uuid:receipt-test",
    credentialHash,
    documentHash: "sha256:" + "cd".repeat(32),
    issuerId: did,
    issuerDid: did,
    status: "ACTIVE",
    issuedAt: "2026-08-20T00:00:00.000Z",
    version: 1,
  });
  const blocks = await ledger.listBlocks();
  const index = findCredentialBlockIndex(blocks, credentialHash);
  const built = buildBlockInclusionProof(blocks, index, credentialHash);
  assert.equal(built.ok, true);
  if (!built.ok) throw new Error("proof");
  const sth = treeHeadFromBlocks(blocks, did, keys.secretKey, "2026-08-21T00:00:00.000Z");
  return { credentialHash, proof: built.proof, sth };
}

test("receipt binds inclusion proof to the signed tree head", async () => {
  const { credentialHash, proof, sth } = await seeded();
  const receipt = buildLedgerReceipt(proof, sth, credentialHash);
  const check = verifyLedgerReceipt(receipt);
  assert.equal(check.receiptValid, true);
  assert.equal(check.included, true);
  assert.equal(check.signatureValid, true);
  assert.equal(check.rootsMatch, true);
  assert.equal(check.diplomaEvaluated, false);
  assert.equal("status" in check, false);
});

test("proof from one tree and STH from another is not receiptValid", async () => {
  const a = await seeded();
  const b = await seeded();
  const check = verifyLedgerReceipt(buildLedgerReceipt(a.proof, b.sth, a.credentialHash));
  assert.equal(check.receiptValid, false);
  assert.equal(check.diplomaEvaluated, false);
  assert.equal(check.rootsMatch, false);
});

test("wrong credentialHash on the envelope fails closed", async () => {
  const { proof, sth } = await seeded();
  const check = verifyLedgerReceipt(buildLedgerReceipt(proof, sth, "sha256:" + "ff".repeat(32)));
  assert.equal(check.receiptValid, false);
});
