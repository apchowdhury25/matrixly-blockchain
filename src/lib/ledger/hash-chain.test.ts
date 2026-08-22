import assert from "node:assert/strict";
import { test } from "node:test";
import { HashChainLedgerAdapter, MemoryLedgerStore, verifyBlockSequence } from "./hash-chain";
import { FabricLedgerAdapter } from "./fabric";

test("hash chain links blocks and detects tampering", async () => {
  const store = new MemoryLedgerStore();
  const ledger = new HashChainLedgerAdapter(store);
  await ledger.registerIssuer({
    issuerId: "did:key:zIssuer",
    issuerDid: "did:key:zIssuer",
    name: "Global University",
    status: "ACTIVE",
    publicKeyMultibase: "zIssuer",
  });
  await ledger.registerDocumentAnchor({
    documentHash: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    issuerDid: "did:key:zIssuer",
  });
  const chain = await ledger.verifyChain();
  assert.equal(chain.valid, true);
  assert.equal(chain.length, 2);

  store.blocks[1]!.payload.record = { ...store.blocks[1]!.payload.record, documentHash: "sha256:bbbb" };
  const broken = verifyBlockSequence(store.blocks);
  assert.equal(broken.valid, false);
});

test("duplicate credential registration is rejected", async () => {
  const ledger = new HashChainLedgerAdapter(new MemoryLedgerStore());
  const record = {
    credentialId: "urn:uuid:dup",
    credentialHash: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    documentHash: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    issuerId: "iss",
    issuerDid: "did:key:z",
    status: "ACTIVE" as const,
    issuedAt: "2026-08-20T00:00:00.000Z",
    version: 1,
  };
  await ledger.registerCredential(record);
  await assert.rejects(() => ledger.registerCredential(record));
});

test("DID registration is append-only and retrievable", async () => {
  const ledger = new HashChainLedgerAdapter(new MemoryLedgerStore());
  const rec = {
    did: "did:key:zIssuer",
    documentHash: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    publicKeyMultibase: "zIssuer",
    status: "ACTIVE" as const,
  };
  await ledger.registerDid(rec);
  const found = await ledger.getDid(rec.did);
  assert.equal(found?.documentHash, rec.documentHash);
  const again = await ledger.registerDid(rec);
  assert.equal(typeof again.blockHash, "string");
});

test("schema registration is retrievable and rejects a different hash", async () => {
  const ledger = new HashChainLedgerAdapter(new MemoryLedgerStore());
  const rec = {
    schemaId: "https://trust.matrixly.ai/schemas/university-degree-credential.json",
    schemaHash: "sha256:" + "aa".repeat(32),
    schemaType: "JsonSchema" as const,
    status: "ACTIVE" as const,
  };
  await ledger.registerSchema(rec);
  const found = await ledger.getSchema(rec.schemaId);
  assert.equal(found?.schemaHash, rec.schemaHash);
  await assert.rejects(() => ledger.registerSchema({ ...rec, schemaHash: "sha256:" + "bb".repeat(32) }));
});

test("Fabric adapter refuses to fake transactions", async () => {
  const fabric = new FabricLedgerAdapter();
  await assert.rejects(() => fabric.registerCredential({
    credentialId: "x",
    credentialHash: "sha256:00",
    documentHash: "sha256:00",
    issuerId: "i",
    issuerDid: "did:key:z",
    status: "ACTIVE",
    issuedAt: "2026-08-20T00:00:00.000Z",
    version: 1,
  }));
  await assert.rejects(() => fabric.registerDid({
    did: "did:key:z",
    documentHash: "sha256:00",
    publicKeyMultibase: "z",
    status: "ACTIVE",
  }));
  await assert.rejects(() =>
    fabric.registerSchema({
      schemaId: "https://example/schema.json",
      schemaHash: "sha256:00",
      schemaType: "JsonSchema",
      status: "ACTIVE",
    }),
  );
});
