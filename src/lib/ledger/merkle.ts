/**
 * RFC 6962 Merkle tree over ordered block hashes.
 * This is a commitment to the export, not a Bitcoin tree, not a Fabric world-state trie,
 * and not a diploma VALID.
 */
import { bytesToHex, concatBytes, hashesEqual, hexToBytes, parsePrefixedHash, sha256Bytes } from "../crypto/hash";

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

function prefixed(bytes: Uint8Array): string {
  return `sha256:${bytesToHex(bytes)}`;
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
  return { merkleRoot: prefixed(layer[0]!), algorithm: MERKLE_ALG };
}

export function merkleRootsEqual(a: string, b: string): boolean {
  return hashesEqual(a, b);
}

export type MerkleProofStep = { side: "L" | "R"; hash: string };

export type MerkleInclusionProof = {
  algorithm: typeof MERKLE_ALG;
  index: number;
  leaf: string;
  merkleRoot: string;
  path: MerkleProofStep[];
};

export function merkleInclusionProof(
  blockHashes: string[],
  index: number,
): { ok: true; proof: MerkleInclusionProof } | { ok: false; reason: string } {
  if (index < 0 || index >= blockHashes.length) {
    return { ok: false, reason: "Merkle leaf index is out of range" };
  }
  const { merkleRoot } = merkleRootFromBlockHashes(blockHashes);
  let layer = blockHashes.map((h) => leafHash(h));
  let i = index;
  const path: MerkleProofStep[] = [];
  while (layer.length > 1) {
    const odd = i % 2 === 1;
    const sibling = odd ? i - 1 : i + 1;
    if (sibling >= 0 && sibling < layer.length) {
      path.push({ side: odd ? "L" : "R", hash: prefixed(layer[sibling]!) });
    }
    const next: Uint8Array[] = [];
    for (let j = 0; j < layer.length; j += 2) {
      const left = layer[j]!;
      const right = layer[j + 1];
      next.push(right ? nodeHash(left, right) : left);
    }
    layer = next;
    i = Math.floor(i / 2);
  }
  return {
    ok: true,
    proof: {
      algorithm: MERKLE_ALG,
      index,
      leaf: blockHashes[index]!,
      merkleRoot,
      path,
    },
  };
}

export function verifyMerkleInclusionProof(proof: MerkleInclusionProof): { included: boolean; reason?: string } {
  try {
    let h = leafHash(proof.leaf);
    for (const step of proof.path) {
      const sib = hexToBytes(parsePrefixedHash(step.hash).hex);
      h = step.side === "L" ? nodeHash(sib, h) : nodeHash(h, sib);
    }
    if (!hashesEqual(prefixed(h), proof.merkleRoot)) {
      return { included: false, reason: "Merkle audit path does not recompute the stated root" };
    }
    return { included: true };
  } catch (err) {
    return { included: false, reason: (err as Error).message };
  }
}
