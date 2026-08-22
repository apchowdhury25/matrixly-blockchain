import assert from "node:assert/strict";
import { test } from "node:test";
import { encodeDidKey, generateEd25519KeyPair, publicKeyMultibase } from "../crypto/ed25519";
import { issueCredential } from "../credentials/issue";
import { statusListForIssuer } from "../credentials/status-list-credential";
import { HashChainLedgerAdapter, MemoryLedgerStore } from "../ledger/hash-chain";
import { registerPublishedSchema } from "../schema/anchor";
import { verifyCredential } from "../verification/pipeline";
import {
  assertDidWebHost,
  buildDidWebDocument,
  didWebForTenant,
  didWebToHttpsUrl,
  parseDidWeb,
  verificationMethodForDid,
} from "./did-web";
import { resolveDid } from "./resolve";

test("did:web maps to https did.json and refuses private hosts", () => {
  assert.equal(
    didWebToHttpsUrl("did:web:example.edu").ok === true &&
      (didWebToHttpsUrl("did:web:example.edu") as { url: string }).url,
    "https://example.edu/.well-known/did.json",
  );
  const path = didWebToHttpsUrl("did:web:matrixly.example.test:issuers:global-university");
  assert.equal(path.ok, true);
  if (path.ok) {
    assert.equal(path.url, "https://matrixly.example.test/issuers/global-university/did.json");
  }
  assert.equal(parseDidWeb("did:key:z6Mkabc").ok, false);
  assert.throws(() => assertDidWebHost("127.0.0.1"), /not allowed/);
  assert.throws(() => assertDidWebHost("169.254.169.254"), /not allowed/);
  assert.throws(() => assertDidWebHost("10.0.0.8"), /not allowed/);
});

test("did:web document id mismatch fails closed", async () => {
  const keys = generateEd25519KeyPair();
  const mb = publicKeyMultibase(keys.publicKey);
  const did = didWebForTenant("global-university");
  const foreign = buildDidWebDocument({ did: "did:web:evil.example.test:issuers:global-university", publicKeyMultibase: mb });
  const resolved = await resolveDid(did, { localDocument: async () => foreign });
  assert.equal(resolved.ok, false);
});

test("injected did:web document verifies a credential signed with the same key", async () => {
  const keys = generateEd25519KeyPair();
  const mb = publicKeyMultibase(keys.publicKey);
  const didKey = encodeDidKey(keys.publicKey);
  const webDid = didWebForTenant("global-university");
  const document = buildDidWebDocument({ did: webDid, publicKeyMultibase: mb, alsoKnownAs: [didKey] });
  const credential = issueCredential({
    credentialId: "urn:uuid:didweb-test",
    issuerDid: webDid,
    issuerName: "Registrar",
    subjectName: "Alex Rivera",
    degreeName: "Bachelor of Computer Science",
    validFrom: "2026-05-16T00:00:00.000Z",
    documentHash: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    statusListCredentialId: "https://example.test/status/1",
    statusListIndex: 0,
    secretKey: keys.secretKey,
    verificationMethod: verificationMethodForDid(webDid, mb),
  });
  const store = new MemoryLedgerStore();
  const ledger = new HashChainLedgerAdapter(store);
  await ledger.registerDid({
    did: webDid,
    documentHash: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    publicKeyMultibase: mb,
    status: "ACTIVE",
  });
  await ledger.registerIssuer({
    issuerId: webDid,
    issuerDid: webDid,
    name: "Registrar",
    status: "ACTIVE",
    publicKeyMultibase: mb,
  });
  await registerPublishedSchema(ledger);
  await ledger.registerDocumentAnchor({
    documentHash: credential.credentialSubject.documentHash,
    credentialId: credential.id,
    issuerDid: webDid,
  });
  await ledger.registerCredential({
    credentialId: credential.id,
    credentialHash: "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    documentHash: credential.credentialSubject.documentHash,
    issuerId: webDid,
    issuerDid: webDid,
    status: "ACTIVE",
    issuedAt: credential.validFrom,
    version: 1,
  });
  const result = await verifyCredential(
    {
      credential,
      statusListCredential: statusListForIssuer({
        issuerDid: webDid,
        secretKey: keys.secretKey,
        issued: credential.validFrom,
        verificationMethod: verificationMethodForDid(webDid, mb),
      }),
      resolve: { localDocument: async () => document },
    },
    ledger,
  );
  assert.equal(result.signatureValid, true);
  assert.equal(result.issuerVerified, true);
  assert.equal(result.status, "VALID");
});

test("HTTPS fetch of a missing did:web fails closed — never VALID", async () => {
  const resolved = await resolveDid("did:web:missing.example.edu", {
    fetch: async () => ({ ok: false, status: 404, error: "HTTP 404" }),
    localDocument: async () => null,
  });
  assert.equal(resolved.ok, false);
  if (!resolved.ok) assert.match(resolved.reason, /fetch failed|404/);
});
