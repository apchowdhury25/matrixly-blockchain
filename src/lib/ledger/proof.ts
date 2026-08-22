/** Merkle inclusion of a ledger block. included ≠ diploma VALID. */

import { LEDGER_DIPLOMA_DISCLAIMER } from "./disclaimer";
import { payloadHashOf, verifyBlock, type LedgerBlock } from "./hash-chain";
import {
  MERKLE_ALG,
  merkleInclusionProof,
  merkleRootFromBlockHashes,
  verifyMerkleInclusionProof,
  type MerkleInclusionProof,
} from "./merkle";

export const MERKLE_PROOF_FORMAT = "matrixly.merkle-proof.v1";

export type CredentialInclusionProof = {
  format: typeof MERKLE_PROOF_FORMAT;
  algorithm: typeof MERKLE_ALG;
  diplomaEvaluated: false;
  disclaimer: typeof LEDGER_DIPLOMA_DISCLAIMER;
  credentialHash?: string;
  block: LedgerBlock;
  merkle: MerkleInclusionProof;
};

export type InclusionCheck = {
  included: boolean;
  diplomaEvaluated: false;
  disclaimer: typeof LEDGER_DIPLOMA_DISCLAIMER;
  merkleRoot?: string;
  reason?: string;
};

export function buildBlockInclusionProof(
  blocks: LedgerBlock[],
  index: number,
  credentialHash?: string,
): { ok: true; proof: CredentialInclusionProof } | { ok: false; reason: string } {
  const built = merkleInclusionProof(
    blocks.map((b) => b.blockHash),
    index,
  );
  if (!built.ok) return built;
  const block = blocks[index]!;
  return {
    ok: true,
    proof: {
      format: MERKLE_PROOF_FORMAT,
      algorithm: MERKLE_ALG,
      diplomaEvaluated: false,
      disclaimer: LEDGER_DIPLOMA_DISCLAIMER,
      credentialHash,
      block,
      merkle: built.proof,
    },
  };
}

export function findCredentialBlockIndex(blocks: LedgerBlock[], credentialHash: string): number {
  for (let i = blocks.length - 1; i >= 0; i--) {
    const rec = blocks[i]!.payload.record as { credentialHash?: string };
    if (blocks[i]!.payload.kind === "CREDENTIAL" && rec.credentialHash === credentialHash) return i;
  }
  return -1;
}

export function verifyCredentialInclusionProof(raw: unknown): InclusionCheck {
  const fail = (reason: string): InclusionCheck => ({
    included: false,
    diplomaEvaluated: false,
    disclaimer: LEDGER_DIPLOMA_DISCLAIMER,
    reason,
  });
  if (!raw || typeof raw !== "object") return fail("Proof must be a JSON object");
  const rec = raw as Record<string, unknown>;
  if (rec.format !== MERKLE_PROOF_FORMAT) return fail(`Unsupported proof format ${String(rec.format)}`);
  const block = rec.block as LedgerBlock | undefined;
  const merkle = rec.merkle as MerkleInclusionProof | undefined;
  if (!block || !merkle) return fail("Proof must include block and merkle path");
  const internal = verifyBlock(block, block.previousHash);
  if (!internal.valid) return fail(internal.reason ?? "Block is internally inconsistent");
  if (block.blockHash !== merkle.leaf) return fail("Merkle leaf is not this block hash");
  if (payloadHashOf(block.payload) !== block.payloadHash) return fail("Payload hash mismatch");
  const claimed = rec.credentialHash;
  if (typeof claimed === "string") {
    const recHash = (block.payload.record as { credentialHash?: string }).credentialHash;
    if (block.payload.kind !== "CREDENTIAL" || recHash !== claimed) {
      return fail("Proof block does not carry the claimed credentialHash");
    }
  }
  const merkleCheck = verifyMerkleInclusionProof(merkle);
  if (!merkleCheck.included) return fail(merkleCheck.reason ?? "Merkle path failed");
  return {
    included: true,
    diplomaEvaluated: false,
    disclaimer: LEDGER_DIPLOMA_DISCLAIMER,
    merkleRoot: merkle.merkleRoot,
  };
}

export function publishedRoot(blocks: LedgerBlock[]): string {
  return merkleRootFromBlockHashes(blocks.map((b) => b.blockHash)).merkleRoot;
}
