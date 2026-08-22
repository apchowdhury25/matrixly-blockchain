import { verifyDocumentProof } from "../crypto/ed25519";
import { hashesEqual, sha256Bytes } from "../crypto/hash";
import { validateCredentialStructure } from "../credentials/issue";
import { decodeStatusList, getBit } from "../credentials/status-list";
import { verifyStatusListCredential } from "../credentials/status-list-credential";
import { resolveDid, type ResolveDidOptions } from "../identity/resolve";
import type { DistributedLedgerAdapter } from "../ledger/adapter";
import { validateCredentialSchema } from "../schema/university-degree";
import { resolveStatusListCredential, type StatusListResolveOptions } from "../status/resolve";
import { applyPolicyReasons, DEFAULT_POLICY, type VerifierPolicy } from "./policy";

export type VerificationInput = {
  credential: Record<string, unknown>;
  documentBytes?: Uint8Array;
  now?: Date;
  /** @deprecated Pass `statusListCredential`. Raw bitstrings are not evidence. */
  encodedStatusList?: string;
  statusListCredential?: Record<string, unknown>;
  policy?: VerifierPolicy;
  resolve?: ResolveDidOptions;
  statusListResolve?: StatusListResolveOptions;
};

export type VerificationResult = {
  verified: boolean;
  issuerVerified: boolean;
  signatureValid: boolean;
  documentIntegrityValid: boolean | null;
  ledgerProofValid: boolean;
  statusListValid: boolean | null;
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
  policyId?: string;
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
  const policy = input.policy ?? DEFAULT_POLICY;
  const now = input.now ?? new Date();
  const result: VerificationResult = {
    verified: false,
    issuerVerified: false,
    signatureValid: false,
    documentIntegrityValid: null,
    ledgerProofValid: false,
    statusListValid: null,
    credentialActive: false,
    expired: false,
    revoked: false,
    superseded: false,
    suspended: false,
    status: "INVALID",
    reasons,
    policyId: policy.id,
  };

  const structural = validateCredentialStructure(input.credential);
  if (structural.length) {
    reasons.push(...structural);
    return result;
  }
  const schemaErrors = validateCredentialSchema(input.credential);
  if (schemaErrors.length) {
    reasons.push(...schemaErrors);
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

  const resolved = await resolveDid(issuerDid, input.resolve);
  if (!resolved.ok) {
    reasons.push(`Issuer DID could not be resolved (${issuerDid}): ${resolved.reason}`);
    return result;
  }
  const publicKey = resolved.publicKey;

  const issuerRecord = await ledger.getIssuer(issuerDid).catch(() => null);
  const issuerByDid = issuerRecord ?? (await findIssuerByDid(ledger, issuerDid));
  if (!issuerByDid) {
    reasons.push("Unknown issuer: DID is not registered on the ledger");
    return finalize(result, policy);
  }
  if (issuerByDid.status !== "ACTIVE") {
    reasons.push(`Issuer status is ${issuerByDid.status}`);
    result.suspended = issuerByDid.status === "SUSPENDED";
    return finalize(result, policy);
  }
  result.issuerVerified = true;
  result.issuerName = issuerByDid.name || result.issuerName;

  const proof = verifyDocumentProof(input.credential, publicKey);
  result.signatureValid = proof.valid;
  if (!proof.valid) {
    reasons.push(proof.reason ?? "Signature verification failed");
    return finalize(result, policy);
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
    return finalize(result, policy);
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

  const statusEntry = input.credential.credentialStatus as
    | { statusListIndex?: string; statusListCredential?: string; type?: string }
    | undefined;
  let revoked = ledgerCred.status === "REVOKED";
  if (statusEntry) {
    let statusListCredential = input.statusListCredential;
    if (!statusListCredential && statusEntry.statusListCredential) {
      const fetched = await resolveStatusListCredential(statusEntry.statusListCredential, input.statusListResolve);
      if (!fetched.ok) {
        result.statusListValid = false;
        reasons.push(fetched.reason);
      } else {
        statusListCredential = fetched.credential;
      }
    }
    if (statusListCredential) {
      const slc = await verifyStatusListCredential(
        statusListCredential,
        issuerDid,
        input.resolve,
      );
      result.statusListValid = slc.ok;
      if (!slc.ok) {
        reasons.push(slc.reason ?? "Status list credential failed verification");
      } else {
        const index = Number(statusEntry.statusListIndex ?? NaN);
        if (Number.isInteger(index)) {
          try {
            const list = decodeStatusList(slc.encodedList!);
            if (getBit(list, index)) revoked = true;
          } catch (err) {
            result.statusListValid = false;
            reasons.push(`Status list could not be decoded: ${(err as Error).message}`);
          }
        }
      }
    } else if (input.encodedStatusList && !policy.requireSignedStatusList) {
      result.statusListValid = false;
      const index = Number(statusEntry.statusListIndex ?? NaN);
      if (Number.isInteger(index)) {
        try {
          const list = decodeStatusList(input.encodedStatusList);
          if (getBit(list, index)) revoked = true;
        } catch (err) {
          reasons.push(`Status list could not be decoded: ${(err as Error).message}`);
        }
      }
    } else if (result.statusListValid !== false) {
      result.statusListValid = false;
      reasons.push("Signed Bitstring Status List credential was not supplied");
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

  return finalize(result, policy);
}

async function findIssuerByDid(ledger: DistributedLedgerAdapter, did: string) {
  return ledger.getIssuer(did);
}

function finalize(result: VerificationResult, policy: VerifierPolicy): VerificationResult {
  const policyReasons = applyPolicyReasons(
    {
      issuerDid: result.issuerDid,
      issuerVerified: result.issuerVerified,
      ledgerProofValid: result.ledgerProofValid,
      statusListValid: result.statusListValid,
      revoked: result.revoked,
      expired: result.expired,
    },
    policy,
  );
  for (const reason of policyReasons) {
    if (!result.reasons.includes(reason)) result.reasons.push(reason);
  }

  if (result.revoked) result.status = "REVOKED";
  else if (result.superseded) result.status = "SUPERSEDED";
  else if (result.suspended) result.status = "SUSPENDED";
  else if (result.expired && !policy.allowExpired) result.status = "EXPIRED";
  else if (
    result.issuerVerified &&
    result.signatureValid &&
    result.ledgerProofValid &&
    result.documentIntegrityValid !== false &&
    (result.statusListValid === true || result.statusListValid === null) &&
    result.credentialActive &&
    policyReasons.length === 0
  ) {
    result.status = "VALID";
  } else if (
    policy.allowExpired &&
    result.expired &&
    result.issuerVerified &&
    result.signatureValid &&
    result.ledgerProofValid &&
    result.documentIntegrityValid !== false &&
    result.statusListValid === true &&
    !result.revoked &&
    !result.superseded &&
    !result.suspended &&
    policyReasons.length === 0
  ) {
    result.status = "VALID";
  } else {
    result.status = "INVALID";
  }
  result.verified = result.status === "VALID";
  if (result.verified) result.reasons = [];
  result.policyId = policy.id;
  return result;
}
