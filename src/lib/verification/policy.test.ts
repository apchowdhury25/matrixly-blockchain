import assert from "node:assert/strict";
import { test } from "node:test";
import { generateEd25519KeyPair, encodeDidKey } from "../crypto/ed25519";
import { sha256Bytes } from "../crypto/hash";
import { issueCredential, credentialHash } from "../credentials/issue";
import { statusListForIssuer } from "../credentials/status-list-credential";
import { HashChainLedgerAdapter, MemoryLedgerStore } from "../ledger/hash-chain";
import { verifyCredential } from "./pipeline";
import { DEFAULT_POLICY } from "./policy";

function setup() {
  const keys = generateEd25519KeyPair();
  const did = encodeDidKey(keys.publicKey);
  const ledger = new HashChainLedgerAdapter(new MemoryLedgerStore());
  return { keys, did, ledger };
}

async function issued(ctx: ReturnType<typeof setup>, validUntil?: string) {
  await ctx.ledger.registerIssuer({
    issuerId: ctx.did,
    issuerDid: ctx.did,
    name: "Global University",
    status: "ACTIVE",
    publicKeyMultibase: ctx.did.slice("did:key:".length),
  });
  const documentHash = sha256Bytes(new TextEncoder().encode("%PDF-1.7 policy")).prefixed;
  const credential = issueCredential({
    credentialId: "urn:uuid:policy-1",
    issuerDid: ctx.did,
    issuerName: "Global University",
    subjectName: "Alex Rivera",
    degreeName: "Bachelor of Computer Science",
    validFrom: "2020-01-01T00:00:00.000Z",
    validUntil,
    documentHash,
    statusListCredentialId: "https://trust.matrixly.ai/status/demo",
    statusListIndex: 0,
    secretKey: ctx.keys.secretKey,
  });
  await ctx.ledger.registerDocumentAnchor({ documentHash, issuerDid: ctx.did });
  await ctx.ledger.registerCredential({
    credentialId: credential.id,
    credentialHash: credentialHash(credential),
    documentHash,
    issuerId: ctx.did,
    issuerDid: ctx.did,
    status: "ACTIVE",
    issuedAt: "2020-01-01T00:00:00.000Z",
    expiresAt: validUntil,
    version: 1,
  });
  return credential;
}

test("default policy requires a signed status list credential", async () => {
  assert.equal(DEFAULT_POLICY.requireSignedStatusList, true);
  const ctx = setup();
  const credential = await issued(ctx);
  const missing = await verifyCredential({ credential }, ctx.ledger);
  assert.equal(missing.statusListValid, false);
  assert.equal(missing.status, "INVALID");
  const slc = statusListForIssuer({ issuerDid: ctx.did, secretKey: ctx.keys.secretKey });
  const ok = await verifyCredential({ credential, statusListCredential: slc }, ctx.ledger);
  assert.equal(ok.statusListValid, true);
  assert.equal(ok.status, "VALID");
});

test("tampering encodedList in the status list credential fails its signature", async () => {
  const ctx = setup();
  const credential = await issued(ctx);
  const slc = statusListForIssuer({ issuerDid: ctx.did, secretKey: ctx.keys.secretKey });
  const tampered = structuredClone(slc) as typeof slc;
  (tampered.credentialSubject as { encodedList: string }).encodedList = "uAAAA";
  const result = await verifyCredential({ credential, statusListCredential: tampered }, ctx.ledger);
  assert.equal(result.statusListValid, false);
  assert.equal(result.status, "INVALID");
});

test("allow-list policy rejects an otherwise valid issuer", async () => {
  const ctx = setup();
  const credential = await issued(ctx);
  const slc = statusListForIssuer({ issuerDid: ctx.did, secretKey: ctx.keys.secretKey });
  const result = await verifyCredential(
    {
      credential,
      statusListCredential: slc,
      policy: { ...DEFAULT_POLICY, id: "allow.v1", allowedIssuerDids: ["did:key:zOther"] },
    },
    ctx.ledger,
  );
  assert.equal(result.status, "INVALID");
  assert.equal(result.reasons.some((r) => r.includes("allow-list")), true);
});

test("allowExpired policy can accept an expired but otherwise valid credential", async () => {
  const ctx = setup();
  const credential = await issued(ctx, "2021-01-01T00:00:00.000Z");
  const slc = statusListForIssuer({ issuerDid: ctx.did, secretKey: ctx.keys.secretKey });
  const expired = await verifyCredential(
    { credential, statusListCredential: slc, now: new Date("2026-08-21T00:00:00.000Z") },
    ctx.ledger,
  );
  assert.equal(expired.status, "EXPIRED");
  const historical = await verifyCredential(
    {
      credential,
      statusListCredential: slc,
      now: new Date("2026-08-21T00:00:00.000Z"),
      policy: { ...DEFAULT_POLICY, id: "historical.v1", allowExpired: true },
    },
    ctx.ledger,
  );
  assert.equal(historical.expired, true);
  assert.equal(historical.status, "VALID");
});
