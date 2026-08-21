import {
  decodeDidKey,
  didDocument,
  encodeDidKey,
  publicKeyMultibase,
  verificationMethodId,
} from "../crypto/ed25519";
import { sha256Utf8 } from "../crypto/hash";
import { canonicalize } from "../crypto/jcs";

export const DID_KEY_METHOD = "key" as const;

export type DidDocument = ReturnType<typeof didDocument>;

export type DidResolution =
  | {
      ok: true;
      method: typeof DID_KEY_METHOD;
      did: string;
      publicKey: Uint8Array;
      publicKeyMultibase: string;
      verificationMethod: string;
      document: DidDocument;
    }
  | { ok: false; reason: string };

/** SHA-256 of the JCS-canonical DID document. Anchored on the ledger; document itself stays off-chain. */
export function didDocumentHash(document: DidDocument): string {
  return sha256Utf8(canonicalize(document)).prefixed;
}

export function didKeyFromMultibase(multibase: string): string {
  if (!multibase.startsWith("z")) {
    throw new Error("did:key multibase must start with z");
  }
  return `did:key:${multibase}`;
}

/**
 * Resolve a did:key. The public key is derived from the identifier itself
 * (W3C did:key). Registry metadata (ACTIVE/ROTATED) is a separate concern.
 */
export function resolveDidKey(did: string): DidResolution {
  if (typeof did !== "string" || !did.startsWith("did:")) {
    return { ok: false, reason: "Not a DID" };
  }
  if (!did.startsWith("did:key:")) {
    return { ok: false, reason: `Unsupported DID method: ${did.split(":")[1] ?? "unknown"}` };
  }
  let publicKey: Uint8Array;
  try {
    publicKey = decodeDidKey(did);
  } catch (err) {
    return { ok: false, reason: (err as Error).message };
  }
  const recomputed = encodeDidKey(publicKey);
  if (recomputed !== did) {
    return { ok: false, reason: "did:key does not round-trip to the same identifier" };
  }
  const document = didDocument(did, publicKey);
  if (document.id !== did) {
    return { ok: false, reason: "DID document id does not match the identifier" };
  }
  return {
    ok: true,
    method: DID_KEY_METHOD,
    did,
    publicKey,
    publicKeyMultibase: publicKeyMultibase(publicKey),
    verificationMethod: verificationMethodId(did),
    document,
  };
}
