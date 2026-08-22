/** Independent hash-chain export. A third party recomputes hashes; this is not a VALID badge. */

import { GENESIS_PREV, verifyBlockSequence, type LedgerBlock } from "./hash-chain";
import { MERKLE_ALG, merkleRootFromBlockHashes, merkleRootsEqual } from "./merkle";

export const LEDGER_EXPORT_FORMAT = "matrixly.ledger.v1";

export type LedgerExport = {
  format: typeof LEDGER_EXPORT_FORMAT;
  model: "hash-chain" | "fabric-endorsement";
  genesis: string;
  merkleAlgorithm: typeof MERKLE_ALG;
  merkleRoot: string;
  blocks: LedgerBlock[];
};

export type IndependentChainCheck = {
  chainValid: boolean;
  length: number;
  model: "hash-chain" | "fabric-endorsement";
  genesis: string;
  merkleAlgorithm?: typeof MERKLE_ALG;
  merkleRoot?: string;
  head?: { seq: number; blockHash: string };
  reason?: string;
};

export function buildLedgerExport(blocks: LedgerBlock[], model: LedgerExport["model"] = "hash-chain"): LedgerExport {
  const merkle = merkleRootFromBlockHashes(blocks.map((b) => b.blockHash));
  return {
    format: LEDGER_EXPORT_FORMAT,
    model,
    genesis: GENESIS_PREV,
    merkleAlgorithm: merkle.algorithm,
    merkleRoot: merkle.merkleRoot,
    blocks,
  };
}

export function parseLedgerExport(raw: unknown): { ok: true; export: LedgerExport } | { ok: false; reason: string } {
  if (!raw || typeof raw !== "object") return { ok: false, reason: "Export must be a JSON object" };
  const rec = raw as Record<string, unknown>;
  if (rec.format !== LEDGER_EXPORT_FORMAT) {
    return { ok: false, reason: `Unsupported ledger export format ${String(rec.format)}` };
  }
  if (rec.model !== "hash-chain" && rec.model !== "fabric-endorsement") {
    return { ok: false, reason: "Unknown integrity model" };
  }
  if (!Array.isArray(rec.blocks)) return { ok: false, reason: "blocks must be an array" };
  if (typeof rec.merkleRoot !== "string" || !rec.merkleRoot.startsWith("sha256:")) {
    return { ok: false, reason: "Export must include merkleRoot (sha256:…)" };
  }
  return {
    ok: true,
    export: {
      format: LEDGER_EXPORT_FORMAT,
      model: rec.model,
      genesis: typeof rec.genesis === "string" ? rec.genesis : GENESIS_PREV,
      merkleAlgorithm: MERKLE_ALG,
      merkleRoot: rec.merkleRoot,
      blocks: rec.blocks as LedgerBlock[],
    },
  };
}

export function verifyExportedChain(raw: unknown): IndependentChainCheck {
  const parsed = parseLedgerExport(raw);
  if (!parsed.ok) {
    return { chainValid: false, length: 0, model: "hash-chain", genesis: GENESIS_PREV, reason: parsed.reason };
  }
  if (parsed.export.model === "fabric-endorsement") {
    return {
      chainValid: false,
      length: parsed.export.blocks.length,
      model: "fabric-endorsement",
      genesis: parsed.export.genesis,
      merkleRoot: parsed.export.merkleRoot,
      reason: "Fabric endorsement export is not independently verifiable without Gateway block data",
    };
  }
  if (parsed.export.genesis !== GENESIS_PREV) {
    return {
      chainValid: false,
      length: parsed.export.blocks.length,
      model: "hash-chain",
      genesis: parsed.export.genesis,
      reason: "Genesis previous-hash does not match the published hash-chain genesis",
    };
  }
  const chain = verifyBlockSequence(parsed.export.blocks);
  const merkle = merkleRootFromBlockHashes(parsed.export.blocks.map((b) => b.blockHash));
  if (chain.valid && !merkleRootsEqual(parsed.export.merkleRoot, merkle.merkleRoot)) {
    return {
      chainValid: false,
      length: chain.length,
      model: "hash-chain",
      genesis: parsed.export.genesis,
      merkleAlgorithm: merkle.algorithm,
      merkleRoot: merkle.merkleRoot,
      reason: "Merkle root does not match the recomputed RFC 6962 tree of block hashes",
    };
  }
  const last = parsed.export.blocks[parsed.export.blocks.length - 1];
  return {
    chainValid: chain.valid,
    length: chain.length,
    model: "hash-chain",
    genesis: parsed.export.genesis,
    merkleAlgorithm: merkle.algorithm,
    merkleRoot: merkle.merkleRoot,
    head: last ? { seq: last.seq, blockHash: last.blockHash } : undefined,
    reason: chain.reason,
  };
}

export function findCredentialHash(blocks: LedgerBlock[], credentialHash: string): { seq: number; blockHash: string } | null {
  for (let i = blocks.length - 1; i >= 0; i--) {
    const b = blocks[i]!;
    if (b.payload.kind !== "CREDENTIAL") continue;
    const rec = b.payload.record as { credentialHash?: string };
    if (rec.credentialHash === credentialHash) return { seq: b.seq, blockHash: b.blockHash };
  }
  return null;
}

export function assertExportHasNoHolderPii(blocks: LedgerBlock[]): void {
  const blob = JSON.stringify(blocks);
  if (/\bAlex Rivera\b/.test(blob) || /@university\.edu/i.test(blob)) {
    throw new Error("Ledger export leaked holder PII");
  }
}
