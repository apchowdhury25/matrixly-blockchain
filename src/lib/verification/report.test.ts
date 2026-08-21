import assert from "node:assert/strict";
import { test } from "node:test";
import { generateEd25519KeyPair, encodeDidKey } from "../crypto/ed25519";
import { HashChainLedgerAdapter, MemoryLedgerStore } from "../ledger/hash-chain";
import {
  buildVerificationReport,
  signVerificationReport,
  verificationReportHash,
  verifyVerificationReport,
} from "./report";
import type { VerificationResult } from "./pipeline";

function result(status: VerificationResult["status"] = "VALID"): VerificationResult {
  return {
    verified: status === "VALID",
    issuerVerified: true,
    signatureValid: true,
    documentIntegrityValid: true,
    ledgerProofValid: true,
    statusListValid: true,
    credentialActive: status === "VALID",
    expired: false,
    revoked: status === "REVOKED",
    superseded: false,
    suspended: false,
    status,
    reasons: status === "VALID" ? [] : ["revoked"],
    policyId: "matrixly.default.v1",
    credentialId: "urn:uuid:report-cred",
    documentHash: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    ledgerBlockHash: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  };
}

test("verification report signs, verifies, and excludes holder PII", () => {
  const keys = generateEd25519KeyPair();
  const did = encodeDidKey(keys.publicKey);
  const unsecured = buildVerificationReport({
    reportId: "urn:uuid:report-1",
    verifierDid: did,
    credentialId: "urn:uuid:report-cred",
    credentialHash: "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    documentHash: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    result: result(),
  });
  const signed = signVerificationReport(unsecured, keys.secretKey);
  assert.equal(verifyVerificationReport(signed as unknown as Record<string, unknown>).ok, true);
  const serialized = JSON.stringify(signed);
  assert.equal(serialized.includes("Alex"), false);
  assert.equal(serialized.includes("Rivera"), false);
  assert.equal(serialized.includes("holderName"), false);
  assert.equal(serialized.includes("email"), false);
});

test("tampered verification report fails the signature", () => {
  const keys = generateEd25519KeyPair();
  const did = encodeDidKey(keys.publicKey);
  const signed = signVerificationReport(
    buildVerificationReport({
      reportId: "urn:uuid:report-2",
      verifierDid: did,
      credentialId: "urn:uuid:report-cred",
      credentialHash: "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      result: result(),
    }),
    keys.secretKey,
  );
  const tampered = structuredClone(signed) as typeof signed;
  tampered.result = "VALID";
  tampered.checks.signatureValid = true;
  // flip a check after signing
  (tampered.checks as { issuerVerified: boolean }).issuerVerified = false;
  assert.equal(verifyVerificationReport(tampered as unknown as Record<string, unknown>).ok, false);
});

test("ledger verification anchors store the report hash, not the report body", async () => {
  const keys = generateEd25519KeyPair();
  const did = encodeDidKey(keys.publicKey);
  const signed = signVerificationReport(
    buildVerificationReport({
      reportId: "urn:uuid:report-3",
      verifierDid: did,
      credentialId: "urn:uuid:report-cred",
      credentialHash: "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      result: result("REVOKED"),
    }),
    keys.secretKey,
  );
  const hash = verificationReportHash(signed as unknown as Record<string, unknown>);
  const ledger = new HashChainLedgerAdapter(new MemoryLedgerStore());
  await ledger.registerVerificationAnchor({
    reportId: signed.id,
    reportHash: hash,
    credentialHash: signed.credentialHash,
    resultStatus: signed.result,
    verifierDid: did,
    at: signed.created,
  });
  const serialized = JSON.stringify(await ledger.listBlocks());
  assert.equal(serialized.includes(hash), true);
  assert.equal(serialized.includes(signed.proof.proofValue), false);
  const found = await ledger.getVerificationAnchor(hash);
  assert.equal(found?.reportHash, hash);
  assert.equal(found?.resultStatus, "REVOKED");
});
