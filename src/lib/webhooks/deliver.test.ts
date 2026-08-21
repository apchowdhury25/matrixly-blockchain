import assert from "node:assert/strict";
import { test } from "node:test";
import { verificationEventPayload } from "./payload";

test("webhook event payload is hashes and flags — no holder name", () => {
  const payload = verificationEventPayload({
    eventId: "wh_1",
    source: "api",
    created: "2026-08-21T18:00:00.000Z",
    result: {
      status: "VALID",
      verified: true,
      checks: {
        issuerRegistered: true,
        signatureValid: true,
        documentSha256: true,
        ledgerProof: true,
        signedStatusList: true,
        credentialActive: true,
      },
      issuerDid: "did:key:zIssuer",
      credentialId: "urn:uuid:demo-valid-bcs",
      credentialHash: "sha256:aa",
      documentHash: "sha256:bb",
      reportRef: "rep1",
      reportHash: "sha256:cc",
      reasons: [],
      subject: { name: "Alex Rivera", credentialTitle: "BCS" },
    },
  });
  const blob = JSON.stringify(payload);
  assert.equal(blob.includes("Alex"), false);
  assert.equal(blob.includes("Rivera"), false);
  assert.equal(payload.type, "verification.completed");
  assert.equal(payload.status, "VALID");
});
