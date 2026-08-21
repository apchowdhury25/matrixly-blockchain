import assert from "node:assert/strict";
import { test } from "node:test";
import { API_KEY_PREFIX, generateApiKey, hashApiKey, hashesMatch, parseBearer } from "./keys";
import { toMachineResult } from "./machine";

test("generated keys are prefixed, hashed, and not stored as the secret", () => {
  const key = generateApiKey();
  assert.equal(key.secret.startsWith(API_KEY_PREFIX), true);
  assert.equal(key.prefix.startsWith(API_KEY_PREFIX), true);
  assert.notEqual(key.secretHash, key.secret);
  assert.equal(key.secretHash, hashApiKey(key.secret));
  assert.equal(hashesMatch(key.secretHash, hashApiKey(key.secret)), true);
  assert.equal(hashesMatch(key.secretHash, hashApiKey(key.secret + "x")), false);
});

test("Bearer parser rejects missing, non-Bearer, and short tokens", () => {
  assert.equal(parseBearer(null), null);
  assert.equal(parseBearer("Basic abc"), null);
  assert.equal(parseBearer("Bearer mtx_live_"), null);
  const key = generateApiKey();
  assert.equal(parseBearer(`Bearer ${key.secret}`), key.secret);
});

test("machine result omits holder PII unless includeSubject", () => {
  const result = toMachineResult(
    {
      verified: true,
      issuerVerified: true,
      signatureValid: true,
      documentIntegrityValid: true,
      ledgerProofValid: true,
      statusListValid: true,
      credentialActive: true,
      expired: false,
      revoked: false,
      superseded: false,
      suspended: false,
      status: "VALID",
      reasons: [],
      issuerDid: "did:key:zIssuer",
    },
    { holderName: "Alex Rivera", degreeName: "BCS", includeSubject: false },
  );
  const blob = JSON.stringify(result);
  assert.equal(result.subject, undefined);
  assert.equal(blob.includes("Alex"), false);
  assert.equal(blob.includes("Rivera"), false);
  const withSubject = toMachineResult(
    {
      verified: true,
      issuerVerified: true,
      signatureValid: true,
      documentIntegrityValid: true,
      ledgerProofValid: true,
      statusListValid: true,
      credentialActive: true,
      expired: false,
      revoked: false,
      superseded: false,
      suspended: false,
      status: "VALID",
      reasons: [],
    },
    { holderName: "Alex Rivera", includeSubject: true },
  );
  assert.equal(withSubject.subject?.name, "Alex Rivera");
});
