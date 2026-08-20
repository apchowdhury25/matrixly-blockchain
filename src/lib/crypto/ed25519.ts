import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2.js";
import { base58 } from "@scure/base";
import { sha256Bytes, concatBytes, bytesToHex, hexToBytes } from "./hash";
import { canonicalize } from "./jcs";

ed.hashes.sha512 = sha512;

export const ED25519_SUITE = "eddsa-jcs-2022" as const;
export const DATA_INTEGRITY_PROOF = "DataIntegrityProof" as const;

export type Ed25519KeyPair = {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
};

export function generateEd25519KeyPair(): Ed25519KeyPair {
  const { secretKey, publicKey } = ed.keygen();
  return { publicKey, secretKey };
}

export function publicKeyFromSecret(secretKey: Uint8Array): Uint8Array {
  return ed.getPublicKey(secretKey);
}

/** Multicodec header for Ed25519-pub (0xed01) then 32-byte key, base58btc, z prefix. */
export function encodeDidKey(publicKey: Uint8Array): string {
  if (publicKey.byteLength !== 32) throw new Error("Ed25519 public key must be 32 bytes");
  const multicodec = concatBytes(new Uint8Array([0xed, 0x01]), publicKey);
  return `did:key:z${base58.encode(multicodec)}`;
}

export function decodeDidKey(did: string): Uint8Array {
  if (!did.startsWith("did:key:z")) throw new Error("Only did:key (base58btc) is supported");
  const decoded = base58.decode(did.slice("did:key:z".length));
  if (decoded.length !== 34 || decoded[0] !== 0xed || decoded[1] !== 0x01) {
    throw new Error("did:key is not an Ed25519 public key");
  }
  return decoded.slice(2);
}

export function publicKeyMultibase(publicKey: Uint8Array): string {
  return `z${base58.encode(concatBytes(new Uint8Array([0xed, 0x01]), publicKey))}`;
}

export function verificationMethodId(did: string): string {
  return `${did}#${did.slice("did:key:".length)}`;
}

export function didDocument(did: string, publicKey: Uint8Array) {
  const vm = verificationMethodId(did);
  return {
    "@context": ["https://www.w3.org/ns/did/v1", "https://w3id.org/security/multikey/v1"],
    id: did,
    controller: did,
    verificationMethod: [
      {
        id: vm,
        type: "Multikey",
        controller: did,
        publicKeyMultibase: publicKeyMultibase(publicKey),
      },
    ],
    authentication: [vm],
    assertionMethod: [vm],
  };
}

export type DataIntegrityProof = {
  type: typeof DATA_INTEGRITY_PROOF;
  cryptosuite: typeof ED25519_SUITE;
  created: string;
  verificationMethod: string;
  proofPurpose: "assertionMethod";
  proofValue: string;
};

export type SignedDocument = Record<string, unknown> & { proof: DataIntegrityProof };

function proofConfig(input: {
  created: string;
  verificationMethod: string;
}): Record<string, unknown> {
  return {
    type: DATA_INTEGRITY_PROOF,
    cryptosuite: ED25519_SUITE,
    created: input.created,
    verificationMethod: input.verificationMethod,
    proofPurpose: "assertionMethod",
  };
}

/** W3C vc-di-eddsa eddsa-jcs-2022 hashData = sha256(jcs(proofConfig)) || sha256(jcs(doc)). */
export function hashDataForProof(
  unsecuredDocument: Record<string, unknown>,
  config: Record<string, unknown>,
): Uint8Array {
  const configHash = hexToBytes(sha256Bytes(new TextEncoder().encode(canonicalize(config))).hex);
  const docHash = hexToBytes(
    sha256Bytes(new TextEncoder().encode(canonicalize(unsecuredDocument))).hex,
  );
  return concatBytes(configHash, docHash);
}

export function signDocument(
  unsecuredDocument: Record<string, unknown>,
  secretKey: Uint8Array,
  options: { created?: string; verificationMethod: string },
): SignedDocument {
  const created = options.created ?? new Date().toISOString();
  const config = proofConfig({ created, verificationMethod: options.verificationMethod });
  const data = hashDataForProof(unsecuredDocument, config);
  const signature = ed.sign(data, secretKey);
  const proof: DataIntegrityProof = {
    ...(config as Omit<DataIntegrityProof, "proofValue">),
    proofValue: `z${base58.encode(signature)}`,
  };
  return { ...unsecuredDocument, proof };
}

export type ProofVerification = {
  valid: boolean;
  reason?: string;
};

export function verifyDocumentProof(
  signed: Record<string, unknown>,
  publicKey: Uint8Array,
): ProofVerification {
  const proof = signed.proof as DataIntegrityProof | undefined;
  if (!proof || typeof proof !== "object") {
    return { valid: false, reason: "Missing proof" };
  }
  if (proof.type !== DATA_INTEGRITY_PROOF) {
    return { valid: false, reason: `Unsupported proof type: ${String(proof.type)}` };
  }
  if (proof.cryptosuite !== ED25519_SUITE) {
    return { valid: false, reason: `Unsupported cryptosuite: ${String(proof.cryptosuite)}` };
  }
  if (typeof proof.proofValue !== "string" || !proof.proofValue.startsWith("z")) {
    return { valid: false, reason: "proofValue must be base58btc multibase" };
  }
  const { proof: _removed, ...unsecured } = signed;
  const config = proofConfig({
    created: proof.created,
    verificationMethod: proof.verificationMethod,
  });
  let signature: Uint8Array;
  try {
    signature = base58.decode(proof.proofValue.slice(1));
  } catch {
    return { valid: false, reason: "proofValue is not valid base58btc" };
  }
  const data = hashDataForProof(unsecured as Record<string, unknown>, config);
  const ok = ed.verify(signature, data, publicKey);
  return ok ? { valid: true } : { valid: false, reason: "Ed25519 signature does not match" };
}

export function encodeSecretKeyHex(secretKey: Uint8Array): string {
  return bytesToHex(secretKey);
}

export function decodeSecretKeyHex(hex: string): Uint8Array {
  const bytes = hexToBytes(hex);
  if (bytes.byteLength !== 32) throw new Error("Ed25519 secret key must be 32 bytes");
  return bytes;
}
