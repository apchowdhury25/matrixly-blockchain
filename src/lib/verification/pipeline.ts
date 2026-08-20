import { decodeDidKey, verifyDocumentProof } from "../crypto/ed25519";
import { hashesEqual, sha256Bytes } from "../crypto/hash";
import { validateCredentialStructure } from "../credentials/issue";
import { decodeStatusList, getBit } from "../credentials/status-list";
import type { DistributedLedgerAdapter } from "../ledger/adapter";

export type VerificationInput = {
  credential: Record<string, unknown>;
  documentBytes?: Uint8Array;
  now?: Date;
  encodedStatusList?: string;
};

export type VerificationResult = {
  verified: boolean;
  issuerVerified: boolean;
  signatureValid: boolean;
  documentIntegrityValid: boolean | null;
  ledgerProofValid: boolean;
  credentialActive: boolean;
  expired: boolean;
  revoked: boolean;
  superseded: boolean;
  suspended: boolean;
  status: "VALID" | "INVALID" | "REVOKED" | "EXPIRED" | "SUSPENDED" | "SUPERSEDED";
  reasons: string[];
  issuerName?: string;
  issuerDid?: string;
  credentialId?: string;
  credentialType?: string;
  issued?: string;
  documentHash?: string;
  ledgerBlockHash?: string;
};

function issuerDidOf(credential: Record<string, unknown>): string | undefined {
  const issuer = credential.issuer as { id?: string } | string | undefined;
  return typeof issuer === "string" ? issuer : issuer?.id;
}

function issuerNameOf(credential: Record<string, unknown>): string | undefined {
  const issuer = credential.issuer as { name?: string } | string | undefined;
  return typeof issuer === "string" ? undefined : issuer?.name;
}

function subjectDocumentHash(credential: Record<string, unknown>): string | undefined {
  const subject = credential.credentialSubject as { documentHash?: string } | undefined;
  return typeof subject?.documentHash === "string" ? subject.documentHash : undefined;
}

export async function verifyCredential(
  input: VerificationInput,
  ledger: DistributedLedgerAdapter,
): Promise<VerificationResult> {
  const reasons: string[] = [];
  const now = input.now ?? new Date();
  const result: VerificationResult = {
    verified: false,
    issuerVerified: false,
    signatureValid: false,
    documentIntegrityValid: null,
    ledgerProofValid: false,
    credentialActive: false,
    expired: false,
    revoked: false,
    superseded: false,
    suspended: false,
    status: "INVALID",
    reasons,
  };

  const structural = validateCredentialStructure(input.credential);
  if (structural.length) {
    reasons.push(...structural);
    return result;
  }

  const credentialId = String(input.credential.id);
  const issuerDid = issuerDidOf(input.credential);
  result.credentialId = credentialId;
  result.issuerDid = issuerDid;
  result.issuerName = issuerNameOf(input.credential);
  result.issued = String(input.credential.validFrom);
  const types = input.credential.type;
  if (Array.isArray(types)) {
    result.credentialType = types.filter((t) => t !== "VerifiableCredential").join(", ") || "VerifiableCredential";
  }

  if (!issuerDid) {
    reasons.push("Issuer DID is missing");
    return result;
  }

  let publicKey: Uint8Array;
  try {
    publicKey = decodeDidKey(issuerDid);
  } catch (err) {
    reasons.push(`Issuer DID could not be resolved (${issuerDid}): ${(err as Error).message}`);
    return result;
  }

  const issuerRecord = await ledger.getIssuer(issuerDid).catch(() => null);
  const issuerByDid = issuerRecord ?? (await findIssuerByDid(ledger, issuerDid));
  if (!issuerByDid) {
    reasons.push("Unknown issuer: DID is not registered on the ledger");
    return result;
  }
  if (issuerByDid.status !== "ACTIVE") {
    reasons.push(`Issuer status is ${issuerByDid.status}`);
    result.suspended = issuerByDid.status === "SUSPENDED";
    return finalize(result);
  }
  result.issuerVerified = true;
  result.issuerName = issuerByDid.name || result.issuerName;

  const proof = verifyDocumentProof(input.credential, publicKey);
  result.signatureValid = proof.valid;
  if (!proof.valid) {
    reasons.push(proof.reason ?? "Signature verification failed");
    return finalize(result);
  }

  const claimedDocHash = subjectDocumentHash(input.credential);
  result.documentHash = claimedDocHash;
  if (input.documentBytes) {
    const actual = sha256Bytes(input.documentBytes).prefixed;
    result.documentIntegrityValid = Boolean(claimedDocHash && hashesEqual(actual, claimedDocHash));
    if (!claimedDocHash) {
      reasons.push("Credential does not bind a document hash");
    } else if (!result.documentIntegrityValid) {
      reasons.push("Document bytes do not match the bound SHA-256 hash");
    }
  } else if (claimedDocHash) {
    const anchor = await ledger.getDocumentAnchor(claimedDocHash);
    result.documentIntegrityValid = Boolean(anchor);
    if (!anchor) {
      reasons.push("Document hash is not anchored on the ledger");
    }
  }

  const ledgerCred = await ledger.getCredential(credentialId);
  if (!ledgerCred) {
    reasons.push("Credential is not registered on the ledger");
    return finalize(result);
  }
  const chain = await ledger.verifyChain();
  result.ledgerProofValid = chain.valid && ledgerCred.credentialId === credentialId;
  if (!chain.valid) {
    reasons.push(chain.reason ?? "Ledger chain verification failed");
  }
  const latest = await ledger.getLatestBlock();
  result.ledgerBlockHash = latest?.blockHash;

  const validFrom = new Date(String(input.credential.validFrom));
  const validUntil = input.credential.validUntil
    ? new Date(String(input.credential.validUntil))
    : ledgerCred.expiresAt
      ? new Date(ledgerCred.expiresAt)
      : null;
  if (Number.isNaN(validFrom.getTime())) reasons.push("validFrom is not a valid timestamp");
  if (validUntil && now.getTime() > validUntil.getTime()) {
    result.expired = true;
    reasons.push("Credential validity period has ended");
  }
  if (now.getTime() < validFrom.getTime()) {
    reasons.push("Credential is not yet valid");
  }

  let revoked = ledgerCred.status === "REVOKED";
  if (input.encodedStatusList) {
    const status = input.credential.credentialStatus as { statusListIndex?: string } | undefined;
    const index = Number(status?.statusListIndex ?? NaN);
    if (Number.isInteger(index)) {
      try {
        const list = decodeStatusList(input.encodedStatusList);
        if (getBit(list, index)) revoked = true;
      } catch (err) {
        reasons.push(`Status list could not be decoded: ${(err as Error).message}`);
      }
    }
  }
  result.revoked = revoked;
  result.superseded = ledgerCred.status === "SUPERSEDED";
  result.suspended = ledgerCred.status === "SUSPENDED" || result.suspended;
  result.credentialActive =
    ledgerCred.status === "ACTIVE" && !result.expired && !result.revoked && !result.superseded && !result.suspended;

  if (result.revoked) reasons.push("Credential has been revoked");
  if (result.superseded) reasons.push("Credential has been superseded");
  if (result.suspended) reasons.push("Credential or issuer is suspended");

  return finalize(result);
}

async function findIssuerByDid(ledger: DistributedLedgerAdapter, did: string) {
  return ledger.getIssuer(did);
}

function finalize(result: VerificationResult): VerificationResult {
  if (result.revoked) result.status = "REVOKED";
  else if (result.superseded) result.status = "SUPERSEDED";
  else if (result.suspended) result.status = "SUSPENDED";
  else if (result.expired) result.status = "EXPIRED";
  else if (
    result.issuerVerified &&
    result.signatureValid &&
    result.ledgerProofValid &&
    result.documentIntegrityValid !== false &&
    result.credentialActive
  ) {
    result.status = "VALID";
  } else {
    result.status = "INVALID";
  }
  result.verified = result.status === "VALID";
  if (result.verified) result.reasons = [];
  return result;
}
