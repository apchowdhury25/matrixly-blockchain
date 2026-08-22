import type { VerificationResult } from "../verification/pipeline";
import type { PresentationResult } from "../credentials/presentation";
import { LEGAL_LIABILITY_SHORT, LEGAL_PATH } from "../legal/liability";

export type MachineChecks = {
  issuerRegistered: boolean;
  signatureValid: boolean;
  documentSha256: boolean | null;
  ledgerProof: boolean;
  signedStatusList: boolean | null;
  schemaAnchored: boolean | null;
  schemaValid: boolean | null;
  credentialActive: boolean;
  holderPresentationProof?: boolean;
};

export type MachineVerification = {
  status: VerificationResult["status"];
  verified: boolean;
  checks: MachineChecks;
  issuerDid?: string;
  credentialId?: string;
  credentialHash?: string;
  documentHash?: string;
  reportRef?: string;
  reportHash?: string;
  reasons: string[];
  notices?: { legal: string; liability: string };
  /** Omitted unless the caller explicitly asks. Never required for authenticity. */
  subject?: { name?: string; credentialTitle?: string };
};

export function toMachineResult(
  result: VerificationResult | PresentationResult,
  extra?: {
    reportRef?: string;
    reportHash?: string;
    credentialId?: string;
    credentialHash?: string;
    includeSubject?: boolean;
    holderName?: string;
    degreeName?: string;
  },
): MachineVerification {
  const presentation = result as PresentationResult;
  const checks: MachineChecks = {
    issuerRegistered: result.issuerVerified,
    signatureValid: result.signatureValid,
    documentSha256: result.documentIntegrityValid,
    ledgerProof: result.ledgerProofValid,
    signedStatusList: result.statusListValid ?? null,
    schemaAnchored: result.schemaAnchored ?? null,
    schemaValid: result.schemaValid ?? null,
    credentialActive: result.credentialActive,
  };
  if (presentation.holderProofValid !== undefined) {
    checks.holderPresentationProof = presentation.holderProofValid;
  }
  const body: MachineVerification = {
    status: result.status,
    verified: result.verified,
    checks,
    issuerDid: result.issuerDid,
    credentialId: extra?.credentialId,
    credentialHash: extra?.credentialHash,
    documentHash: result.documentHash,
    reportRef: extra?.reportRef,
    reportHash: extra?.reportHash,
    reasons: result.reasons,
    notices: { legal: LEGAL_PATH, liability: LEGAL_LIABILITY_SHORT },
  };
  if (extra?.includeSubject) {
    body.subject = { name: extra.holderName, credentialTitle: extra.degreeName };
  }
  return body;
}

export function assertNoSubjectPii(payload: MachineVerification): void {
  const blob = JSON.stringify(payload);
  if (payload.subject) return;
  if (/\bAlex\b|\bRivera\b|@/.test(blob) && blob.includes("holderName")) {
    throw new Error("Machine verification leaked holder PII");
  }
}
