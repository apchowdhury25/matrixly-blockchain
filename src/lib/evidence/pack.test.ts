import assert from "node:assert/strict";
import { test } from "node:test";
import { assertEvidencePackMinimized, buildEvidencePack } from "./pack";

const result = {
  status: "VALID" as const,
  verified: true,
  issuerVerified: true,
  signatureValid: true,
  documentIntegrityValid: true,
  ledgerProofValid: true,
  statusListValid: true,
  reasons: [] as string[],
  issuerDid: "did:key:zIssuer",
  documentHash: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
};

test("evidence pack includes hashes and the signed report, not the PDF or holder name", () => {
  const pack = buildEvidencePack({
    result,
    credentialId: "urn:uuid:demo-valid-bcs",
    credentialHash: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    reportRef: "rep_demo",
    reportHash: "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    reportJson: JSON.stringify({
      type: ["VerificationReport"],
      credentialHash: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      proof: { cryptosuite: "eddsa-jcs-2022" },
    }),
    reportSignatureValid: true,
    ledgerAnchored: true,
    adapter: "HashChainLedgerAdapter",
    integrityModel: "hash-chain",
    created: "2026-08-21T18:00:00.000Z",
  });
  assert.equal(pack.type, "MatrixlyEvidencePack");
  assert.equal(pack.reportSignatureValid, true);
  assert.equal(pack.ledgerAnchored, true);
  assertEvidencePackMinimized(pack);
});

test("evidence pack minimization fails closed if a holder name is inserted", () => {
  const pack = buildEvidencePack({ result });
  assert.throws(() => assertEvidencePackMinimized({ ...pack, reasons: ["Holder Alex Rivera"] }), /PII/);
});
