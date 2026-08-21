import { inspectBytes, randomObjectName, type InspectedFile } from "../crypto/inspect";
import { sha256Bytes, type ContentHash } from "../crypto/hash";

export type DocumentOrigin = "GENERATED" | "UPLOADED";

/**
 * Off-chain evidence package. The ledger stores only `hash`.
 * Original filename is intentionally absent — it is not evidence.
 */
export type DocumentEvidence = {
  algorithm: "sha256";
  hash: string;
  mime: string;
  kind: InspectedFile["kind"];
  byteLength: number;
  objectName: string;
  origin: DocumentOrigin;
};

export type BuiltEvidence = {
  inspection: InspectedFile;
  hash: ContentHash;
  evidence: DocumentEvidence;
};

/** Inspect bytes (magic, not names), SHA-256 the exact bytes, build the evidence package. */
export function buildEvidence(bytes: Uint8Array, origin: DocumentOrigin): BuiltEvidence {
  const inspection = inspectBytes(bytes);
  const hash = sha256Bytes(bytes);
  return {
    inspection,
    hash,
    evidence: {
      algorithm: "sha256",
      hash: hash.prefixed,
      mime: inspection.mime,
      kind: inspection.kind,
      byteLength: inspection.byteLength,
      objectName: randomObjectName(inspection.kind),
      origin,
    },
  };
}

export function parseEvidence(json: string | null | undefined): DocumentEvidence | null {
  if (!json) return null;
  try {
    const value = JSON.parse(json) as DocumentEvidence;
    if (value.algorithm !== "sha256" || typeof value.hash !== "string") return null;
    return value;
  } catch {
    return null;
  }
}
