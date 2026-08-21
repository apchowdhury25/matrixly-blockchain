import type { VerificationResult } from "../verification/pipeline";

export type EvidencePack = {
  type: "MatrixlyEvidencePack";
  version: "1";
  created: string;
  status: VerificationResult["status"];
  verified: boolean;
  issuerDid?: string;
  credentialId?: string;
  credentialHash?: string;
  documentHash?: string;
  reportRef?: string;
  reportHash?: string;
  reportJson?: string;
  reportSignatureValid?: boolean;
  ledgerAnchored?: boolean;
  adapter?: string;
  integrityModel?: string;
  checks: {
    issuerRegistered: boolean;
    signatureValid: boolean;
    documentSha256: boolean | null;
    ledgerProof: boolean;
    signedStatusList: boolean | null;
  };
  reasons: string[];
};

export function buildEvidencePack(input: {
  result: Pick<
    VerificationResult,
    | "status"
    | "verified"
    | "issuerVerified"
    | "signatureValid"
    | "documentIntegrityValid"
    | "ledgerProofValid"
    | "statusListValid"
    | "reasons"
    | "issuerDid"
    | "documentHash"
  >;
  credentialId?: string;
  credentialHash?: string;
  reportRef?: string;
  reportHash?: string;
  reportJson?: string;
  reportSignatureValid?: boolean;
  ledgerAnchored?: boolean;
  adapter?: string;
  integrityModel?: string;
  created?: string;
}): EvidencePack {
  return {
    type: "MatrixlyEvidencePack",
    version: "1",
    created: input.created ?? new Date().toISOString(),
    status: input.result.status,
    verified: input.result.verified,
    issuerDid: input.result.issuerDid,
    credentialId: input.credentialId,
    credentialHash: input.credentialHash,
    documentHash: input.result.documentHash,
    reportRef: input.reportRef,
    reportHash: input.reportHash,
    reportJson: input.reportJson,
    reportSignatureValid: input.reportSignatureValid,
    ledgerAnchored: input.ledgerAnchored,
    adapter: input.adapter,
    integrityModel: input.integrityModel,
    checks: {
      issuerRegistered: input.result.issuerVerified,
      signatureValid: input.result.signatureValid,
      documentSha256: input.result.documentIntegrityValid,
      ledgerProof: input.result.ledgerProofValid,
      signedStatusList: input.result.statusListValid ?? null,
    },
    reasons: input.result.reasons,
  };
}

export function evidencePackBlob(pack: EvidencePack): string {
  return JSON.stringify(pack);
}

export function assertEvidencePackMinimized(pack: EvidencePack): void {
  const blob = evidencePackBlob(pack);
  if (blob.includes("Alex") || blob.includes("Rivera") || blob.includes("@global.edu")) {
    throw new Error("Evidence pack leaked holder PII");
  }
  if (blob.includes("%PDF") || blob.includes("content_b64")) {
    throw new Error("Evidence pack included original document bytes");
  }
}
