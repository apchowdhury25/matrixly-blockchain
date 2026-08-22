import assert from "node:assert/strict";
import { test } from "node:test";
import { encodeDidKey, generateEd25519KeyPair } from "../crypto/ed25519";
import { HashChainLedgerAdapter, MemoryLedgerStore } from "./hash-chain";
import { merkleRootFromBlockHashes } from "./merkle";
import { treeHeadFromBlocks, verifyTreeHead } from "./sth";

test("signed tree head verifies and is not diploma VALID", async () => {
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
  const blocks = await ledger.listBlocks();
  const sth = treeHeadFromBlocks(blocks, did, keys.secretKey, "2026-08-21T00:00:00.000Z");
  const root = merkleRootFromBlockHashes(blocks.map((b) => b.blockHash)).merkleRoot;
  const check = verifyTreeHead(sth, root);
  assert.equal(check.signatureValid, true);
  assert.equal(check.diplomaEvaluated, false);
  assert.equal(check.merkleRoot, root);
  assert.equal("status" in check, false);
});

test("tampered merkleRoot in an STH fails the proof", async () => {
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
  const sth = treeHeadFromBlocks(await ledger.listBlocks(), did, keys.secretKey);
  (sth.tree as { merkleRoot: string }).merkleRoot = "sha256:" + "00".repeat(32);
  const check = verifyTreeHead(sth);
  assert.equal(check.signatureValid, false);
});

test("wrong expected root fails closed", async () => {
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
  const sth = treeHeadFromBlocks(await ledger.listBlocks(), did, keys.secretKey);
  const check = verifyTreeHead(sth, "sha256:" + "ff".repeat(32));
  assert.equal(check.signatureValid, false);
  assert.match(check.reason ?? "", /does not match/);
});
