import assert from "node:assert/strict";
import { test } from "node:test";
import { HashChainLedgerAdapter, MemoryLedgerStore } from "./hash-chain";
import {
  assertExportHasNoHolderPii,
  buildLedgerExport,
  findCredentialHash,
  verifyExportedChain,
} from "./export";

async function seeded() {
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
    credentialId: "urn:uuid:export-test",
    credentialHash,
    documentHash: "sha256:" + "cd".repeat(32),
    issuerId: "did:key:zIssuer",
    issuerDid: "did:key:zIssuer",
    status: "ACTIVE",
    issuedAt: "2026-08-20T00:00:00.000Z",
    version: 1,
  });
  return { ledger, credentialHash };
}

test("exported hash-chain verifies independently and includes the credential hash", async () => {
  const { ledger, credentialHash } = await seeded();
  const blocks = await ledger.listBlocks();
  assertExportHasNoHolderPii(blocks);
  const exported = buildLedgerExport(blocks);
  const check = verifyExportedChain(exported);
  assert.equal(check.chainValid, true);
  assert.equal(check.length, 2);
  assert.equal(exported.merkleRoot.startsWith("sha256:"), true);
  assert.equal(check.merkleRoot, exported.merkleRoot);
  assert.equal(check.diplomaEvaluated, false);
  assert.match(check.disclaimer, /does not mean a diploma is VALID/);
  assert.equal(findCredentialHash(blocks, credentialHash)?.seq, 2);
});

test("tampered payload hash is not chainValid and never a credential VALID", async () => {
  const { ledger } = await seeded();
  const exported = buildLedgerExport(await ledger.listBlocks());
  exported.blocks[1]!.payload.record = { ...exported.blocks[1]!.payload.record, credentialHash: "sha256:" + "ff".repeat(32) };
  const check = verifyExportedChain(exported);
  assert.equal(check.chainValid, false);
  assert.match(check.reason ?? "", /Payload hash mismatch/);
  assert.equal("status" in check, false);
});

test("wrong merkle root is not chainValid", async () => {
  const { ledger } = await seeded();
  const exported = buildLedgerExport(await ledger.listBlocks());
  exported.merkleRoot = "sha256:" + "00".repeat(32);
  const check = verifyExportedChain(exported);
  assert.equal(check.chainValid, false);
  assert.match(check.reason ?? "", /Merkle root/);
});

test("Fabric-model export fails closed without Gateway data", () => {
  const check = verifyExportedChain({
    format: "matrixly.ledger.v1",
    model: "fabric-endorsement",
    genesis: "sha256:" + "00".repeat(32),
    merkleRoot: "sha256:" + "00".repeat(32),
    blocks: [],
  });
  assert.equal(check.chainValid, false);
  assert.match(check.reason ?? "", /Fabric/);
});

test("unknown format is refused", () => {
  const check = verifyExportedChain({ format: "ethereum.blocks", blocks: [] });
  assert.equal(check.chainValid, false);
});
