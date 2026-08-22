import assert from "node:assert/strict";
import { test } from "node:test";
import { HashChainLedgerAdapter, MemoryLedgerStore } from "./hash-chain";
import { merkleInclusionProof, merkleRootFromBlockHashes, verifyMerkleInclusionProof } from "./merkle";
import { buildBlockInclusionProof, findCredentialBlockIndex, verifyCredentialInclusionProof } from "./proof";

const H = (n: number) => "sha256:" + n.toString(16).padStart(2, "0").repeat(32);

test("inclusion proof recomputes the root for 1–5 leaves", () => {
  for (const n of [1, 2, 3, 4, 5]) {
    const hashes = Array.from({ length: n }, (_, i) => H(i + 1));
    const { merkleRoot } = merkleRootFromBlockHashes(hashes);
    for (let i = 0; i < n; i++) {
      const built = merkleInclusionProof(hashes, i);
      assert.equal(built.ok, true);
      if (!built.ok) continue;
      assert.equal(built.proof.merkleRoot, merkleRoot);
      assert.equal(verifyMerkleInclusionProof(built.proof).included, true);
    }
  }
});

test("wrong sibling is not included and never a diploma VALID", () => {
  const hashes = [H(1), H(2), H(3)];
  const built = merkleInclusionProof(hashes, 0);
  assert.equal(built.ok, true);
  if (!built.ok) return;
  const tampered = {
    ...built.proof,
    path: built.proof.path.map((s) => ({ ...s, hash: H(9) })),
  };
  const check = verifyMerkleInclusionProof(tampered);
  assert.equal(check.included, false);
  assert.equal("status" in check, false);
});

test("credential hash inclusion binds the CREDENTIAL payload", async () => {
  const ledger = new HashChainLedgerAdapter(new MemoryLedgerStore());
  await ledger.registerIssuer({
    issuerId: "did:key:zIssuer",
    issuerDid: "did:key:zIssuer",
    name: "Global University",
    status: "ACTIVE",
    publicKeyMultibase: "zIssuer",
  });
  const credentialHash = "sha256:" + "ab".repeat(32);
  await ledger.registerCredential({
    credentialId: "urn:uuid:proof-test",
    credentialHash,
    documentHash: "sha256:" + "cd".repeat(32),
    issuerId: "did:key:zIssuer",
    issuerDid: "did:key:zIssuer",
    status: "ACTIVE",
    issuedAt: "2026-08-20T00:00:00.000Z",
    version: 1,
  });
  const blocks = await ledger.listBlocks();
  const index = findCredentialBlockIndex(blocks, credentialHash);
  assert.equal(index >= 0, true);
  const built = buildBlockInclusionProof(blocks, index, credentialHash);
  assert.equal(built.ok, true);
  if (!built.ok) return;
  const ok = verifyCredentialInclusionProof(built.proof);
  assert.equal(ok.included, true);
  assert.equal(ok.diplomaEvaluated, false);
  const wrongClaim = verifyCredentialInclusionProof({ ...built.proof, credentialHash: "sha256:" + "ff".repeat(32) });
  assert.equal(wrongClaim.included, false);
});
