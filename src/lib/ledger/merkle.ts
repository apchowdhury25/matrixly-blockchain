/**
 * RFC 6962 Merkle tree over ordered block hashes.
 * This is a commitment to the export, not a Bitcoin tree, not a Fabric world-state trie,
 * and not a diploma VALID.
 */
import { concatBytes, hashesEqual, hexToBytes, parsePrefixedHash, sha256Bytes } from "../crypto/hash";

export const MERKLE_ALG = "rfc6962-sha256";
const LEAF_PREFIX = new Uint8Array([0x00]);
const NODE_PREFIX = new Uint8Array([0x01]);

function digest(bytes: Uint8Array): Uint8Array {
  return hexToBytes(sha256Bytes(bytes).hex);
}

function leafHash(prefixedBlockHash: string): Uint8Array {
  const { hex } = parsePrefixedHash(prefixedBlockHash);
  return digest(concatBytes(LEAF_PREFIX, hexToBytes(hex)));
}

function nodeHash(left: Uint8Array, right: Uint8Array): Uint8Array {
  return digest(concatBytes(NODE_PREFIX, left, right));
}

export function merkleRootFromBlockHashes(blockHashes: string[]): {
  merkleRoot: string;
  algorithm: typeof MERKLE_ALG;
} {
  if (blockHashes.length === 0) {
    return { merkleRoot: sha256Bytes(new Uint8Array()).prefixed, algorithm: MERKLE_ALG };
  }
  let layer = blockHashes.map((h) => leafHash(h));
  while (layer.length > 1) {
    const next: Uint8Array[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i]!;
      const right = layer[i + 1];
      next.push(right ? nodeHash(left, right) : left);
    }
    layer = next;
  }
  return { merkleRoot: `sha256:${Buffer.from(layer[0]!).toString("hex")}`, algorithm: MERKLE_ALG };
}

export function merkleRootsEqual(a: string, b: string): boolean {
  return hashesEqual(a, b);
}
