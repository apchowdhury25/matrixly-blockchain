import assert from "node:assert/strict";
import { test } from "node:test";
import { generateEd25519KeyPair, encodeDidKey } from "../crypto/ed25519";
import { sha256Bytes } from "../crypto/hash";
import { HashChainLedgerAdapter, MemoryLedgerStore } from "../ledger/hash-chain";
import { issueCredential, credentialHash } from "./issue";
import { statusListForIssuer } from "./status-list-credential";
import { buildPresentation, signPresentation, verifyPresentation } from "./presentation";

function setup() {
  const issuer = generateEd25519KeyPair();
  const holder = generateEd25519KeyPair();
  const issuerDid = encodeDidKey(issuer.publicKey);
  const holderDid = encodeDidKey(holder.publicKey);
  const ledger = new HashChainLedgerAdapter(new MemoryLedgerStore());
  return { issuer, holder, issuerDid, holderDid, ledger };
}

async function issueBound(
  ctx: ReturnType<typeof setup>,
  subjectId?: string,
): Promise<ReturnType<typeof issueCredential>> {
  await ctx.ledger.registerIssuer({
    issuerId: ctx.issuerDid,
    issuerDid: ctx.issuerDid,
    name: "Global University",
    status: "ACTIVE",
    publicKeyMultibase: ctx.issuerDid.slice("did:key:".length),
  });
  const documentHash = sha256Bytes(new TextEncoder().encode("%PDF-1.7 holder-phase")).prefixed;
  const credential = issueCredential({
    credentialId: "urn:uuid:holder-vp",
    issuerDid: ctx.issuerDid,
    issuerName: "Global University",
    subjectName: "Alex Rivera",
    subjectId,
    degreeName: "Bachelor of Computer Science",
    validFrom: "2026-08-21T00:00:00.000Z",
    documentHash,
    statusListCredentialId: "https://trust.matrixly.ai/status/demo",
    statusListIndex: 0,
    secretKey: ctx.issuer.secretKey,
  });
  await ctx.ledger.registerDocumentAnchor({
    documentHash,
    credentialId: credential.id,
    issuerDid: ctx.issuerDid,
  });
  await ctx.ledger.registerCredential({
    credentialId: credential.id,
    credentialHash: credentialHash(credential),
    documentHash,
    issuerId: ctx.issuerDid,
    issuerDid: ctx.issuerDid,
    status: "ACTIVE",
    issuedAt: "2026-08-21T00:00:00.000Z",
    version: 1,
  });
  return credential;
}

test("holder presentation of an unbound credential verifies", async () => {
  const ctx = setup();
  const credential = await issueBound(ctx);
  const vp = signPresentation(
    buildPresentation({ presentationId: "urn:uuid:vp-1", holderDid: ctx.holderDid, credential }),
    ctx.holder.secretKey,
    "2026-08-21T12:00:00.000Z",
  );
  const result = await verifyPresentation(vp as unknown as Record<string, unknown>, ctx.ledger, {
    statusListCredential: statusListForIssuer({ issuerDid: ctx.issuerDid, secretKey: ctx.issuer.secretKey }),
  });
  assert.equal(result.holderProofValid, true);
  assert.equal(result.status, "VALID");
  assert.equal(result.holderMatchesSubject, null);
  assert.equal(result.holderDid, ctx.holderDid);
});

test("bound credentialSubject.id must match the presenting holder", async () => {
  const ctx = setup();
  const credential = await issueBound(ctx, ctx.holderDid);
  const vp = signPresentation(
    buildPresentation({ presentationId: "urn:uuid:vp-2", holderDid: ctx.holderDid, credential }),
    ctx.holder.secretKey,
  );
  const ok = await verifyPresentation(vp as unknown as Record<string, unknown>, ctx.ledger, {
    statusListCredential: statusListForIssuer({ issuerDid: ctx.issuerDid, secretKey: ctx.issuer.secretKey }),
  });
  assert.equal(ok.status, "VALID");
  assert.equal(ok.holderMatchesSubject, true);

  const other = generateEd25519KeyPair();
  const otherDid = encodeDidKey(other.publicKey);
  const stolen = signPresentation(
    buildPresentation({ presentationId: "urn:uuid:vp-stolen", holderDid: otherDid, credential }),
    other.secretKey,
  );
  const bad = await verifyPresentation(stolen as unknown as Record<string, unknown>, ctx.ledger, {
    statusListCredential: statusListForIssuer({ issuerDid: ctx.issuerDid, secretKey: ctx.issuer.secretKey }),
  });
  assert.equal(bad.holderProofValid, true);
  assert.equal(bad.holderMatchesSubject, false);
  assert.equal(bad.status, "INVALID");
});

test("wrong holder key fails the presentation proof", async () => {
  const ctx = setup();
  const credential = await issueBound(ctx);
  const other = generateEd25519KeyPair();
  const vp = signPresentation(
    buildPresentation({ presentationId: "urn:uuid:vp-3", holderDid: ctx.holderDid, credential }),
    other.secretKey,
  );
  const result = await verifyPresentation(vp as unknown as Record<string, unknown>, ctx.ledger, {
    statusListCredential: statusListForIssuer({ issuerDid: ctx.issuerDid, secretKey: ctx.issuer.secretKey }),
  });
  assert.equal(result.holderProofValid, false);
  assert.equal(result.status, "INVALID");
});

test("invalid inner credential cannot be laundered through a valid presentation", async () => {
  const ctx = setup();
  const credential = await issueBound(ctx);
  const tampered = structuredClone(credential) as typeof credential;
  tampered.credentialSubject.name = "Impostor";
  const vp = signPresentation(
    buildPresentation({ presentationId: "urn:uuid:vp-4", holderDid: ctx.holderDid, credential: tampered }),
    ctx.holder.secretKey,
  );
  const result = await verifyPresentation(vp as unknown as Record<string, unknown>, ctx.ledger, {
    statusListCredential: statusListForIssuer({ issuerDid: ctx.issuerDid, secretKey: ctx.issuer.secretKey }),
  });
  assert.equal(result.holderProofValid, true);
  assert.equal(result.signatureValid, false);
  assert.equal(result.status, "INVALID");
});
