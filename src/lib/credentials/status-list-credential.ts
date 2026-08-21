import { signDocument, verificationMethodId, verifyDocumentProof } from "../crypto/ed25519";
import { resolveDidKey } from "../identity/did";
import { VC_CONTEXT_V2, type IssuedCredential } from "./types";
import { emptyStatusList, encodeStatusList, setBit } from "./status-list";

export const BITSTRING_STATUS_LIST_CONTEXT = "https://www.w3.org/ns/credentials/status/v1";

export type StatusListVerify = {
  ok: boolean;
  encodedList?: string;
  reason?: string;
};

export function issueStatusListCredential(input: {
  credentialId: string;
  issuerDid: string;
  issuerName?: string;
  encodedList: string;
  validFrom?: string;
  secretKey: Uint8Array;
}): IssuedCredential {
  const validFrom = input.validFrom ?? new Date().toISOString();
  const unsecured = {
    "@context": [VC_CONTEXT_V2, BITSTRING_STATUS_LIST_CONTEXT],
    type: ["VerifiableCredential", "BitstringStatusListCredential"],
    id: input.credentialId,
    issuer: { id: input.issuerDid, name: input.issuerName ?? "Issuer" },
    validFrom,
    credentialSubject: {
      id: `${input.credentialId}#list`,
      type: "BitstringStatusList",
      statusPurpose: "revocation",
      encodedList: input.encodedList,
    },
  };
  return signDocument(unsecured, input.secretKey, {
    created: validFrom,
    verificationMethod: verificationMethodId(input.issuerDid),
    proofPurpose: "assertionMethod",
  }) as IssuedCredential;
}

export function statusListForIssuer(input: {
  issuerDid: string;
  secretKey: Uint8Array;
  revokedIndexes?: number[];
  credentialId?: string;
}): IssuedCredential {
  let bits = emptyStatusList();
  for (const index of input.revokedIndexes ?? []) bits = setBit(bits, index, true);
  return issueStatusListCredential({
    credentialId: input.credentialId ?? "https://trust.matrixly.ai/credentials/status/test",
    issuerDid: input.issuerDid,
    encodedList: encodeStatusList(bits),
    validFrom: "2026-08-21T00:00:00.000Z",
    secretKey: input.secretKey,
  });
}

/** Verify the status list credential itself. Bits are not trusted without this proof. */
export function verifyStatusListCredential(
  slc: Record<string, unknown>,
  expectedIssuerDid: string,
): StatusListVerify {
  const types = slc.type;
  if (!Array.isArray(types) || !types.includes("BitstringStatusListCredential")) {
    return { ok: false, reason: "Status document is not a BitstringStatusListCredential" };
  }
  const issuer = slc.issuer as { id?: string } | string | undefined;
  const issuerDid = typeof issuer === "string" ? issuer : issuer?.id;
  if (!issuerDid) return { ok: false, reason: "Status list issuer is missing" };
  if (issuerDid !== expectedIssuerDid) {
    return { ok: false, reason: "Status list issuer does not match the credential issuer" };
  }
  const resolved = resolveDidKey(issuerDid);
  if (!resolved.ok) return { ok: false, reason: `Status list issuer DID: ${resolved.reason}` };
  const proof = verifyDocumentProof(slc, resolved.publicKey);
  if (!proof.valid) return { ok: false, reason: proof.reason ?? "Status list signature failed" };
  const subject = slc.credentialSubject as { encodedList?: string; statusPurpose?: string; type?: string } | undefined;
  if (subject?.statusPurpose && subject.statusPurpose !== "revocation") {
    return { ok: false, reason: `Unsupported statusPurpose ${subject.statusPurpose}` };
  }
  if (typeof subject?.encodedList !== "string") {
    return { ok: false, reason: "Status list encodedList is missing" };
  }
  return { ok: true, encodedList: subject.encodedList };
}
