import {
  encodeDidKey,
  encodeSecretKeyHex,
  generateEd25519KeyPair,
  publicKeyMultibase,
  type Ed25519KeyPair,
} from "../crypto/ed25519";
import { didDocumentHash, resolveDidKey, type DidDocument } from "./did";

export type IssuerIdentity = {
  keys: Ed25519KeyPair;
  did: string;
  document: DidDocument;
  documentHash: string;
  publicKeyMultibase: string;
  sealedSecretHex: string;
};

/** Fresh did:key identity. Caller seals the secret before persistence. */
export function createIssuerIdentity(seal: (plainHex: string) => string): IssuerIdentity {
  const keys = generateEd25519KeyPair();
  const did = encodeDidKey(keys.publicKey);
  const resolved = resolveDidKey(did);
  if (!resolved.ok) throw new Error(resolved.reason);
  return {
    keys,
    did,
    document: resolved.document,
    documentHash: didDocumentHash(resolved.document),
    publicKeyMultibase: publicKeyMultibase(keys.publicKey),
    sealedSecretHex: seal(encodeSecretKeyHex(keys.secretKey)),
  };
}

export function assertActiveSigningKey(status: string): void {
  if (status !== "ACTIVE") {
    throw new Error(`Signing key status is ${status}; only ACTIVE keys may issue`);
  }
}
