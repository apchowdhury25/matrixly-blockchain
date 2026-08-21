import { signDocument, verificationMethodId, verifyDocumentProof } from "../crypto/ed25519";
import { resolveDid, type ResolveDidOptions } from "../identity/resolve";
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
  verificationMethod?: string;
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
    verificationMethod: input.verificationMethod ?? verificationMethodId(input.issuerDid),
    proofPurpose: "assertionMethod",
  }) as IssuedCredential;
}

export function statusListForIssuer(input: {
  issuerDid: string;
  secretKey: Uint8Array;
  revokedIndexes?: number[];
  credentialId?: string;
  verificationMethod?: string;
  issued?: string;
}): IssuedCredential {
  let bits = emptyStatusList();
  for (const index of input.revokedIndexes ?? []) bits = setBit(bits, index, true);
  return issueStatusListCredential({
    credentialId: input.credentialId ?? "https://trust.matrixly.ai/credentials/status/test",
    issuerDid: input.issuerDid,
    encodedList: encodeStatusList(bits),
    validFrom: input.issued ?? "2026-08-21T00:00:00.000Z",
    secretKey: input.secretKey,
    verificationMethod: input.verificationMethod,
  });
}

/** Verify the status list credential itself. Bits are not trusted without this proof. */
export async function verifyStatusListCredential(
  slc: Record<string, unknown>,
  expectedIssuerDid: string,
  resolve?: ResolveDidOptions,
): Promise<StatusListVerify> {
  const types = slc.type;
  if (!Array.isArray(types) || !types.includes("BitstringStatusListCredential")) {
    return { ok: false, reason: "Status document is not a BitstringStatusListCredential" };
  }
  const issuer = slc.issuer as { id?: string } | string | undefined;
  const issuerDid = typeof issuer === "string" ? issuer : issuer?.id;
  if (!issuerDid) return { ok: false, reason: "Status list issuer is missing" };
  if (issuerDid !== expectedIssuerDid) {
    const expected = await resolveDid(expectedIssuerDid, resolve);
    const aka =
      expected.ok && expected.document && typeof expected.document === "object"
        ? (expected.document as { alsoKnownAs?: unknown }).alsoKnownAs
        : undefined;
    const aliases = Array.isArray(aka) ? aka.filter((x): x is string => typeof x === "string") : [];
    if (!aliases.includes(issuerDid)) {
      return { ok: false, reason: "Status list issuer does not match the credential issuer" };
    }
  }
  const resolved = await resolveDid(issuerDid, resolve);
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
