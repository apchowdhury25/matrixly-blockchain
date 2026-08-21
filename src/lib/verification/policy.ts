export type VerifierPolicy = {
  id: string;
  name: string;
  requireSignedStatusList: boolean;
  requireIssuerOnLedger: boolean;
  requireLedgerAnchor: boolean;
  requireUnrevoked: boolean;
  allowExpired: boolean;
  allowedIssuerDids: string[] | null;
};

export const DEFAULT_POLICY: VerifierPolicy = {
  id: "matrixly.default.v1",
  name: "Matrixly default verifier policy",
  requireSignedStatusList: true,
  requireIssuerOnLedger: true,
  requireLedgerAnchor: true,
  requireUnrevoked: true,
  allowExpired: false,
  allowedIssuerDids: null,
};

export function applyPolicyReasons(
  input: {
    issuerDid?: string;
    issuerVerified: boolean;
    ledgerProofValid: boolean;
    statusListValid: boolean | null;
    revoked: boolean;
    expired: boolean;
  },
  policy: VerifierPolicy,
): string[] {
  const reasons: string[] = [];
  if (policy.requireIssuerOnLedger && !input.issuerVerified) {
    reasons.push(`Policy ${policy.id}: issuer must be registered on the ledger`);
  }
  if (policy.requireLedgerAnchor && !input.ledgerProofValid) {
    reasons.push(`Policy ${policy.id}: credential must be ledger-anchored`);
  }
  if (policy.requireSignedStatusList && input.statusListValid !== true) {
    reasons.push(`Policy ${policy.id}: a signed Bitstring Status List credential is required`);
  }
  if (policy.requireUnrevoked && input.revoked) {
    reasons.push(`Policy ${policy.id}: revoked credentials are not accepted`);
  }
  if (!policy.allowExpired && input.expired) {
    reasons.push(`Policy ${policy.id}: expired credentials are not accepted`);
  }
  if (policy.allowedIssuerDids && input.issuerDid && !policy.allowedIssuerDids.includes(input.issuerDid)) {
    reasons.push(`Policy ${policy.id}: issuer DID is not in the allow-list`);
  }
  return reasons;
}
