/**
 * Ledger receipt = inclusion proof + signed tree head.
 * included && signatureValid && rootsMatch is not diploma VALID.
 */
import { LEDGER_DIPLOMA_DISCLAIMER } from "./disclaimer";
import {
  MERKLE_PROOF_FORMAT,
  verifyCredentialInclusionProof,
  type CredentialInclusionProof,
} from "./proof";
import { STH_DISCLAIMER, STH_FORMAT, verifyTreeHead, type SignedTreeHead } from "./sth";

export const RECEIPT_FORMAT = "matrixly.receipt.v1";

export const RECEIPT_DISCLAIMER =
  "A ledger receipt binds a credential hash to a signed Merkle root. It is not a diploma VALID, not Certificate Transparency, and not a legal determination. Ed25519, document SHA-256, signed status list, and schema still have to pass via POST /api/v1/verify. See /legal.";

export type LedgerReceipt = {
  format: typeof RECEIPT_FORMAT;
  diplomaEvaluated: false;
  disclaimer: typeof RECEIPT_DISCLAIMER;
  credentialHash?: string;
  proof: CredentialInclusionProof;
  sth: SignedTreeHead;
};

export type ReceiptCheck = {
  included: boolean;
  signatureValid: boolean;
  rootsMatch: boolean;
  receiptValid: boolean;
  diplomaEvaluated: false;
  disclaimer: typeof RECEIPT_DISCLAIMER;
  merkleRoot?: string;
  logDid?: string;
  reason?: string;
};

export function buildLedgerReceipt(
  proof: CredentialInclusionProof,
  sth: SignedTreeHead,
  credentialHash?: string,
): LedgerReceipt {
  return {
    format: RECEIPT_FORMAT,
    diplomaEvaluated: false,
    disclaimer: RECEIPT_DISCLAIMER,
    credentialHash: credentialHash ?? proof.credentialHash,
    proof,
    sth,
  };
}

export function verifyLedgerReceipt(raw: unknown): ReceiptCheck {
  const fail = (reason: string, extra?: Partial<ReceiptCheck>): ReceiptCheck => ({
    included: extra?.included ?? false,
    signatureValid: extra?.signatureValid ?? false,
    rootsMatch: extra?.rootsMatch ?? false,
    receiptValid: false,
    diplomaEvaluated: false,
    disclaimer: RECEIPT_DISCLAIMER,
    merkleRoot: extra?.merkleRoot,
    logDid: extra?.logDid,
    reason,
  });
  if (!raw || typeof raw !== "object") return fail("Receipt must be a JSON object");
  const rec = raw as Record<string, unknown>;
  if (rec.format !== RECEIPT_FORMAT) return fail(`Unsupported receipt format ${String(rec.format)}`);
  if (!rec.proof || !rec.sth) return fail("Receipt must include proof and sth");
  const proof = rec.proof as CredentialInclusionProof;
  const sth = rec.sth as SignedTreeHead;
  if (proof.format !== MERKLE_PROOF_FORMAT) return fail("Receipt proof format is not matrixly.merkle-proof.v1");
  if ((sth as { format?: string }).format !== STH_FORMAT) return fail("Receipt STH format is not matrixly.sth.v1");

  const inclusion = verifyCredentialInclusionProof(proof);
  const tree = verifyTreeHead(sth);
  const proofRoot = proof.merkle?.merkleRoot;
  const sthRoot = sth.tree?.merkleRoot;
  const rootsMatch = Boolean(proofRoot && sthRoot && proofRoot === sthRoot);

  if (!inclusion.included) {
    return fail(inclusion.reason ?? "Inclusion proof failed", {
      included: false,
      signatureValid: tree.signatureValid,
      rootsMatch,
      merkleRoot: proofRoot,
      logDid: tree.logDid,
    });
  }
  if (!tree.signatureValid) {
    return fail(tree.reason ?? "Signed tree head failed", {
      included: true,
      signatureValid: false,
      rootsMatch,
      merkleRoot: proofRoot,
      logDid: tree.logDid,
    });
  }
  if (!rootsMatch) {
    return fail("Inclusion proof Merkle root does not match the signed tree head", {
      included: true,
      signatureValid: true,
      rootsMatch: false,
      merkleRoot: proofRoot,
      logDid: tree.logDid,
    });
  }
  const claimed = rec.credentialHash;
  if (typeof claimed === "string" && proof.credentialHash && claimed !== proof.credentialHash) {
    return fail("Receipt credentialHash does not match the proof", {
      included: true,
      signatureValid: true,
      rootsMatch: true,
      merkleRoot: proofRoot,
      logDid: tree.logDid,
    });
  }
  if (rec.diplomaEvaluated === true) return fail("Receipt must not claim diplomaEvaluated");
  return {
    included: true,
    signatureValid: true,
    rootsMatch: true,
    receiptValid: true,
    diplomaEvaluated: false,
    disclaimer: RECEIPT_DISCLAIMER,
    merkleRoot: proofRoot,
    logDid: tree.logDid,
  };
}

export { LEDGER_DIPLOMA_DISCLAIMER, STH_DISCLAIMER };
