import { signDocument, verificationMethodId, verifyDocumentProof } from "../crypto/ed25519";
import { sha256Utf8 } from "../crypto/hash";
import { canonicalize } from "../crypto/jcs";
import { resolveDidKey } from "../identity/did";
import { VC_CONTEXT_V2 } from "../credentials/types";
import type { VerificationResult } from "./pipeline";

export type UnsecuredVerificationReport = {
  "@context": string[];
  type: string[];
  id: string;
  verifier: { id: string };
  created: string;
  credentialId: string;
  credentialHash: string;
  documentHash?: string;
  policyId: string;
  result: string;
  checks: {
    issuerVerified: boolean;
    signatureValid: boolean;
    documentIntegrityValid: boolean | null;
    ledgerProofValid: boolean;
    statusListValid: boolean | null;
  };
  ledgerHead?: string;
};

export type SignedVerificationReport = UnsecuredVerificationReport & {
  proof: {
    type: string;
    cryptosuite: string;
    created: string;
    verificationMethod: string;
    proofPurpose: string;
    proofValue: string;
  };
};

/** Evidence of a verification. Holder names and emails are intentionally absent. */
export function buildVerificationReport(input: {
  reportId: string;
  verifierDid: string;
  created?: string;
  credentialId: string;
  credentialHash: string;
  documentHash?: string;
  result: VerificationResult;
}): UnsecuredVerificationReport {
  const report: UnsecuredVerificationReport = {
    "@context": [VC_CONTEXT_V2],
    type: ["VerificationReport"],
    id: input.reportId,
    verifier: { id: input.verifierDid },
    created: input.created ?? new Date().toISOString(),
    credentialId: input.credentialId,
    credentialHash: input.credentialHash,
    policyId: input.result.policyId ?? "matrixly.default.v1",
    result: input.result.status,
    checks: {
      issuerVerified: input.result.issuerVerified,
      signatureValid: input.result.signatureValid,
      documentIntegrityValid: input.result.documentIntegrityValid,
      ledgerProofValid: input.result.ledgerProofValid,
      statusListValid: input.result.statusListValid ?? null,
    },
  };
  if (input.documentHash) report.documentHash = input.documentHash;
  if (input.result.ledgerBlockHash) report.ledgerHead = input.result.ledgerBlockHash;
  return report;
}

export function signVerificationReport(
  unsecured: UnsecuredVerificationReport,
  secretKey: Uint8Array,
): SignedVerificationReport {
  return signDocument(unsecured as unknown as Record<string, unknown>, secretKey, {
    created: unsecured.created,
    verificationMethod: verificationMethodId(unsecured.verifier.id),
    proofPurpose: "assertionMethod",
  }) as SignedVerificationReport;
}

export function verificationReportHash(report: Record<string, unknown>): string {
  return sha256Utf8(canonicalize(report)).prefixed;
}

export function verifyVerificationReport(report: Record<string, unknown>): { ok: boolean; reason?: string } {
  const types = report.type;
  if (!Array.isArray(types) || !types.includes("VerificationReport")) {
    return { ok: false, reason: "type must include VerificationReport" };
  }
  const verifier = report.verifier as { id?: string } | undefined;
  if (!verifier?.id) return { ok: false, reason: "verifier DID is missing" };
  const resolved = resolveDidKey(verifier.id);
  if (!resolved.ok) return { ok: false, reason: resolved.reason };
  const proof = verifyDocumentProof(report, resolved.publicKey);
  if (!proof.valid) return { ok: false, reason: proof.reason ?? "Report signature failed" };
  return { ok: true };
}
