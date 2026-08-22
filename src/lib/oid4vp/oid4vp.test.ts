import assert from "node:assert/strict";
import { test } from "node:test";
import { encodeDidKey, generateEd25519KeyPair } from "../crypto/ed25519";
import { sha256Bytes } from "../crypto/hash";
import { issueCredential } from "../credentials/issue";
import { buildPresentation, signPresentation } from "../credentials/presentation";
import { statusListForIssuer } from "../credentials/status-list-credential";
import { HashChainLedgerAdapter, MemoryLedgerStore } from "../ledger/hash-chain";
import { registerPublishedSchema } from "../schema/anchor";
import { defaultDegreeDcql, matchCredentialToDcql, parseDcqlQuery, REFUSED_FORMATS } from "./dcql";
import { buildAuthorizationRequest } from "./request";
import { verifyOid4vpSubmission } from "./verify";
import { parseVpToken } from "./vp-token";

async function issued() {
  const issuer = generateEd25519KeyPair();
  const holder = generateEd25519KeyPair();
  const issuerDid = encodeDidKey(issuer.publicKey);
  const holderDid = encodeDidKey(holder.publicKey);
  const ledger = new HashChainLedgerAdapter(new MemoryLedgerStore());
  await ledger.registerIssuer({
    issuerId: issuerDid,
    issuerDid,
    name: "Global University",
    status: "ACTIVE",
    publicKeyMultibase: issuerDid.slice("did:key:".length),
  });
  await registerPublishedSchema(ledger);
  const documentHash = sha256Bytes(new TextEncoder().encode("%PDF-1.7 oid4vp")).prefixed;
  const credential = issueCredential({
    credentialId: "urn:uuid:oid4vp",
    issuerDid,
    issuerName: "Global University",
    subjectName: "Alex Rivera",
    degreeName: "Bachelor of Computer Science",
    validFrom: "2026-08-21T00:00:00.000Z",
    documentHash,
    statusListCredentialId: "https://trust.matrixly.ai/status/demo",
    statusListIndex: 0,
    secretKey: issuer.secretKey,
  });
  await ledger.registerDocumentAnchor({ documentHash, credentialId: credential.id, issuerDid });
  await ledger.registerCredential({
    credentialId: credential.id,
    credentialHash: "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    documentHash,
    issuerId: issuerDid,
    issuerDid,
    status: "ACTIVE",
    issuedAt: credential.validFrom,
    version: 1,
  });
  return {
    issuer,
    holder,
    issuerDid,
    holderDid,
    ledger,
    credential,
    documentHash,
    slc: statusListForIssuer({ issuerDid, secretKey: issuer.secretKey, issued: credential.validFrom }),
  };
}

test("DCQL default query matches a university degree and refuses SD-JWT", () => {
  const query = defaultDegreeDcql().credentials[0]!;
  const okType = matchCredentialToDcql(
    { type: ["VerifiableCredential", "UniversityDegreeCredential"], credentialSubject: { degree: { name: "BCS" }, documentHash: "sha256:aa" } },
    query,
  );
  assert.equal(okType.ok, true);
  const sd = matchCredentialToDcql({ type: ["VerifiableCredential"] }, { id: "x", format: "dc+sd-jwt" });
  assert.equal(sd.ok, false);
  if (!sd.ok) assert.match(sd.reason, /not implemented/);
  assert.equal(REFUSED_FORMATS.has("mso_mdoc"), true);
  assert.equal(parseDcqlQuery({ credentials: [] }).ok, false);
});

test("vp_token JWT is refused; OpenID4VP object form is accepted", () => {
  const jwt = parseVpToken("eyJhbGciOiJFZERTQSJ9.e30.sig", "degree");
  assert.equal(jwt.ok, false);
  const vp = { type: ["VerifiablePresentation"], holder: "did:key:z" };
  const wrapped = parseVpToken({ degree: [vp] }, "degree");
  assert.equal(wrapped.ok, true);
  if (wrapped.ok) assert.equal(wrapped.presentations[0], vp);
});

test("matching nonce binds the VP; a stolen VP from another request is INVALID", async () => {
  const ctx = await issued();
  const request = buildAuthorizationRequest({
    origin: "https://verifier.example.test",
    requestId: "req_test",
    nonce: "nonce-one",
    state: "state-one",
  });
  const unsecured = buildPresentation({
    presentationId: "urn:uuid:oid4vp-vp",
    holderDid: ctx.holderDid,
    credential: ctx.credential,
  });
  const vp = signPresentation(unsecured, ctx.holder.secretKey, ctx.credential.validFrom, {
    challenge: request.nonce,
    domain: request.client_id,
  });
  const ok = await verifyOid4vpSubmission(
    {
      request,
      vpToken: { degree: [vp] },
      state: request.state,
      statusListCredential: ctx.slc,
    },
    ctx.ledger,
  );
  assert.equal(ok.status, "VALID");
  assert.equal(ok.nonceBound, true);
  assert.equal(ok.holderProofValid, true);

  const other = { ...request, nonce: "nonce-two", state: "state-two" };
  const replay = await verifyOid4vpSubmission(
    { request: other, vpToken: { degree: [vp] }, state: other.state, statusListCredential: ctx.slc },
    ctx.ledger,
  );
  assert.equal(replay.status, "INVALID");
  assert.equal(replay.verified, false);
  assert.equal(replay.reasons.some((r) => /nonce|challenge|signature/i.test(r)), true);
});

test("wrong state never returns VALID", async () => {
  const ctx = await issued();
  const request = buildAuthorizationRequest({
    origin: "https://verifier.example.test",
    requestId: "req_state",
    nonce: "n",
    state: "expected",
  });
  const result = await verifyOid4vpSubmission(
    { request, vpToken: { degree: [{}] }, state: "other" },
    ctx.ledger,
  );
  assert.equal(result.status, "INVALID");
  assert.match(result.reasons[0] ?? "", /state/);
});
