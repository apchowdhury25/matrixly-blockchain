import { signDocument, verificationMethodId, verifyDocumentProof } from "../crypto/ed25519";
import { resolveDid } from "../identity/resolve";
import type { DistributedLedgerAdapter } from "../ledger/adapter";
import { VC_CONTEXT_V2, type IssuedCredential } from "./types";
import { verifyCredential, type VerificationResult } from "../verification/pipeline";

export type UnsecuredPresentation = {
  "@context": string[];
  type: string[];
  id: string;
  holder: string;
  verifiableCredential: IssuedCredential[];
};

export type SignedPresentation = UnsecuredPresentation & {
  proof: IssuedCredential["proof"] & { proofPurpose: "authentication" | "assertionMethod" };
};

export type PresentationResult = VerificationResult & {
  holderProofValid: boolean;
  holderDid?: string;
  holderMatchesSubject: boolean | null;
};

export function buildPresentation(input: {
  presentationId: string;
  holderDid: string;
  credential: IssuedCredential;
}): UnsecuredPresentation {
  return {
    "@context": [VC_CONTEXT_V2],
    type: ["VerifiablePresentation"],
    id: input.presentationId,
    holder: input.holderDid,
    verifiableCredential: [input.credential],
  };
}

export function signPresentation(
  unsecured: UnsecuredPresentation,
  secretKey: Uint8Array,
  created?: string,
  binding?: { challenge?: string; domain?: string },
): SignedPresentation {
  return signDocument(unsecured as unknown as Record<string, unknown>, secretKey, {
    created,
    verificationMethod: verificationMethodId(unsecured.holder),
    proofPurpose: "authentication",
    challenge: binding?.challenge,
    domain: binding?.domain,
  }) as SignedPresentation;
}

export function credentialFromPresentation(raw: Record<string, unknown>): Record<string, unknown> | null {
  const list = raw.verifiableCredential;
  if (!Array.isArray(list) || list.length === 0) return null;
  const first = list[0];
  if (!first || typeof first !== "object") return null;
  return first as Record<string, unknown>;
}

function subjectIdOf(credential: Record<string, unknown>): string | undefined {
  const subject = credential.credentialSubject as { id?: string } | undefined;
  return typeof subject?.id === "string" ? subject.id : undefined;
}

/**
 * Verify the holder proof, then run the existing credential pipeline on the inner VC.
 * A valid presentation of an invalid credential is still invalid.
 */
export async function verifyPresentation(
  presentation: Record<string, unknown>,
  ledger: DistributedLedgerAdapter,
  options?: {
    documentBytes?: Uint8Array;
    now?: Date;
    encodedStatusList?: string;
    statusListCredential?: Record<string, unknown>;
    expectedChallenge?: string;
    expectedDomain?: string;
  },
): Promise<PresentationResult> {
  const reasons: string[] = [];
  const base: PresentationResult = {
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
    holderProofValid: false,
    holderMatchesSubject: null,
  };

  const types = presentation.type;
  if (!Array.isArray(types) || !types.includes("VerifiablePresentation")) {
    reasons.push("type must include VerifiablePresentation");
    return base;
  }
  const holderDid = typeof presentation.holder === "string" ? presentation.holder : undefined;
  if (!holderDid) {
    reasons.push("Presentation holder DID is missing");
    return base;
  }
  base.holderDid = holderDid;

  const resolved = await resolveDid(holderDid);
  if (!resolved.ok) {
    reasons.push(`Holder DID could not be resolved: ${resolved.reason}`);
    return base;
  }

  const holderProof = verifyDocumentProof(presentation, resolved.publicKey);
  base.holderProofValid = holderProof.valid;
  if (!holderProof.valid) {
    reasons.push(holderProof.reason ?? "Holder presentation proof failed");
    return base;
  }

  const proof = presentation.proof as { challenge?: string; domain?: string } | undefined;
  if (options?.expectedChallenge) {
    if (proof?.challenge !== options.expectedChallenge) {
      reasons.push("Presentation proof challenge does not match the OpenID4VP nonce");
      base.holderProofValid = false;
      return base;
    }
  }
  if (options?.expectedDomain) {
    if (proof?.domain !== options.expectedDomain) {
      reasons.push("Presentation proof domain does not match the verifier client_id");
      base.holderProofValid = false;
      return base;
    }
  }

  const credential = credentialFromPresentation(presentation);
  if (!credential) {
    reasons.push("Presentation does not contain a verifiable credential");
    return base;
  }

  const subjectId = subjectIdOf(credential);
  if (subjectId) {
    base.holderMatchesSubject = subjectId === holderDid;
    if (!base.holderMatchesSubject) {
      reasons.push("Holder DID does not match credentialSubject.id");
      return base;
    }
  }

  const inner = await verifyCredential(
    {
      credential,
      documentBytes: options?.documentBytes,
      now: options?.now,
      encodedStatusList: options?.encodedStatusList,
      statusListCredential: options?.statusListCredential,
    },
    ledger,
  );
  return {
    ...inner,
    holderProofValid: true,
    holderDid,
    holderMatchesSubject: base.holderMatchesSubject,
    reasons: inner.verified ? [] : [...reasons, ...inner.reasons],
    verified: inner.verified,
  };
}
