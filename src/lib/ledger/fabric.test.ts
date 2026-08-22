import assert from "node:assert/strict";
import { test } from "node:test";
import { FabricLedgerAdapter } from "./fabric";
import type { GatewayContract } from "./gateway";
import { FABRIC_PREVIOUS_UNAVAILABLE } from "./gateway";

class MemoryGatewayContract implements GatewayContract {
  readonly world = new Map<string, string>();
  readonly submits: string[] = [];
  seq = 0n;

  async submitAsync(name: string, options?: { arguments?: string[] }) {
    this.submits.push(name);
    const payload = options?.arguments?.[0] ?? "{}";
    const rec = JSON.parse(payload) as Record<string, string>;
    if (name === "RegisterDID") this.world.set("DID:" + rec.did, payload);
    else if (name === "RegisterIssuer") this.world.set("ISSUER:" + rec.issuerDid, payload);
    else if (name === "RegisterDocumentAnchor") this.world.set("DOCUMENT:" + rec.documentHash, payload);
    else if (name === "RegisterCredential") this.world.set("CREDENTIAL:" + rec.credentialId, payload);
    else if (name === "RegisterVerificationAnchor") this.world.set("VREPORT:" + rec.reportHash, payload);
    else if (name === "RegisterSchema") this.world.set("SCHEMA:" + rec.schemaId, payload);
    else if (name === "SetCredentialStatus") {
      const cred = this.world.get("CREDENTIAL:" + rec.credentialId);
      if (!cred) throw new Error("unknown credential");
      const parsed = JSON.parse(cred) as Record<string, string>;
      parsed.status = rec.status;
      this.world.set("CREDENTIAL:" + rec.credentialId, JSON.stringify(parsed));
      this.world.set("STATUS:" + rec.credentialId, payload);
    }
    this.seq += 1n;
    const tx = `tx-${this.seq.toString()}`;
    return {
      getStatus: async () => ({ successful: true, transactionId: tx, blockNumber: this.seq, code: 0 }),
    };
  }

  async evaluateTransaction(name: string, id: string): Promise<Uint8Array> {
    const key =
      name === "GetDID"
        ? "DID:" + id
        : name === "GetIssuer"
          ? "ISSUER:" + id
          : name === "GetDocumentAnchor"
            ? "DOCUMENT:" + id
            : name === "GetCredential"
              ? "CREDENTIAL:" + id
              : name === "GetCredentialStatus"
                ? "STATUS:" + id
                : name === "GetVerificationAnchor"
                  ? "VREPORT:" + id
                  : name === "GetSchema"
                    ? "SCHEMA:" + id
                  : name + ":" + id;
    const found = this.world.get(key);
    if (!found) throw new Error("not found");
    return new TextEncoder().encode(found);
  }
}

test("unconfigured Fabric adapter refuses to fake a submit", async () => {
  const fabric = new FabricLedgerAdapter();
  await assert.rejects(
    () =>
      fabric.registerCredential({
        credentialId: "x",
        credentialHash: "sha256:00",
        documentHash: "sha256:00",
        issuerId: "i",
        issuerDid: "did:key:z",
        status: "ACTIVE",
        issuedAt: "2026-08-21T00:00:00.000Z",
        version: 1,
      }),
    /Refusing to fake/,
  );
});

test("LEDGER_ADAPTER=fabric without Gateway env refuses to connect", () => {
  assert.throws(() => FabricLedgerAdapter.connect(), /Refusing to fake/);
});

test("injected Gateway contract submits JSON and maps commit status honestly", async () => {
  const contract = new MemoryGatewayContract();
  const ledger = new FabricLedgerAdapter({ contract });
  const submitted = await ledger.registerIssuer({
    issuerId: "did:key:zIssuer",
    issuerDid: "did:key:zIssuer",
    name: "Global University",
    status: "ACTIVE",
    publicKeyMultibase: "zIssuer",
  });
  assert.equal(submitted.previousHash, FABRIC_PREVIOUS_UNAVAILABLE);
  assert.equal(submitted.blockHash.startsWith("fabric:tx:"), true);
  assert.equal(contract.submits.includes("RegisterIssuer"), true);
  const found = await ledger.getIssuer("did:key:zIssuer");
  assert.equal(found?.name, "Global University");
  const chain = await ledger.verifyChain();
  assert.equal(chain.model, "fabric-endorsement");
  assert.equal(chain.valid, true);
  const schema = await ledger.registerSchema({
    schemaId: "https://trust.matrixly.ai/schemas/university-degree-credential.json",
    schemaHash: "sha256:" + "aa".repeat(32),
    schemaType: "JsonSchema",
    status: "ACTIVE",
  });
  assert.equal(schema.blockHash.startsWith("fabric:tx:"), true);
  const got = await ledger.getSchema("https://trust.matrixly.ai/schemas/university-degree-credential.json");
  assert.equal(got?.schemaType, "JsonSchema");
});

test("mock Gateway stores hashes only — no PDF bytes in world state", async () => {
  const contract = new MemoryGatewayContract();
  const ledger = new FabricLedgerAdapter({ contract });
  await ledger.registerDocumentAnchor({
    documentHash: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    issuerDid: "did:key:zIssuer",
  });
  const serialized = JSON.stringify([...contract.world.values()]);
  assert.equal(serialized.includes("%PDF"), false);
  assert.equal(serialized.includes("sha256:aaaaaaaa"), true);
});

test("SetCredentialStatus updates world state without changing the credential hash", async () => {
  const contract = new MemoryGatewayContract();
  const ledger = new FabricLedgerAdapter({ contract });
  await ledger.registerCredential({
    credentialId: "urn:uuid:status",
    credentialHash: "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    documentHash: "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    issuerId: "did:key:z",
    issuerDid: "did:key:z",
    status: "ACTIVE",
    issuedAt: "2026-08-21T00:00:00.000Z",
    version: 1,
  });
  await ledger.setCredentialStatus({
    credentialId: "urn:uuid:status",
    status: "REVOKED",
    reason: "test",
    at: "2026-08-21T12:00:00.000Z",
  });
  const cred = await ledger.getCredential("urn:uuid:status");
  assert.equal(cred?.status, "REVOKED");
  assert.equal(cred?.credentialHash.startsWith("sha256:cc"), true);
});
