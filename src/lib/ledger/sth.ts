/**
 * Signed tree head over the hash-chain Merkle root.
 * Data Integrity eddsa-jcs-2022 — not Certificate Transparency, not diploma VALID.
 */
import {
  decodeDidKey,
  signDocument,
  verificationMethodId,
  verifyDocumentProof,
  type SignedDocument,
} from "../crypto/ed25519";
import { LEDGER_DIPLOMA_DISCLAIMER } from "./disclaimer";
import { GENESIS_PREV, type LedgerBlock } from "./hash-chain";
import { MERKLE_ALG, merkleRootFromBlockHashes } from "./merkle";

export const STH_FORMAT = "matrixly.sth.v1";
export const STH_TYPE = "SignedTreeHead";

export const STH_DISCLAIMER =
  "A signed tree head commits to a Merkle root with Ed25519. It is not Certificate Transparency, not a diploma VALID, and not a legal determination. See /legal.";

export type UnsecuredTreeHead = {
  "@context": string[];
  type: string[];
  id: string;
  format: typeof STH_FORMAT;
  issuer: { id: string };
  validFrom: string;
  tree: {
    model: "hash-chain";
    genesis: string;
    algorithm: typeof MERKLE_ALG;
    merkleRoot: string;
    length: number;
    head?: { seq: number; blockHash: string };
  };
  diplomaEvaluated: false;
  disclaimer: typeof STH_DISCLAIMER;
};

export type SignedTreeHead = UnsecuredTreeHead & SignedDocument;

export function buildUnsecuredTreeHead(input: {
  logDid: string;
  merkleRoot: string;
  length: number;
  created: string;
  head?: { seq: number; blockHash: string };
  genesis?: string;
}): UnsecuredTreeHead {
  return {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: [STH_TYPE],
    id: `urn:matrixly:sth:${input.merkleRoot.slice("sha256:".length, "sha256:".length + 16)}`,
    format: STH_FORMAT,
    issuer: { id: input.logDid },
    validFrom: input.created,
    tree: {
      model: "hash-chain",
      genesis: input.genesis ?? GENESIS_PREV,
      algorithm: MERKLE_ALG,
      merkleRoot: input.merkleRoot,
      length: input.length,
      head: input.head,
    },
    diplomaEvaluated: false,
    disclaimer: STH_DISCLAIMER,
  };
}

export function signTreeHead(unsecured: UnsecuredTreeHead, secretKey: Uint8Array): SignedTreeHead {
  return signDocument(unsecured as unknown as Record<string, unknown>, secretKey, {
    created: unsecured.validFrom,
    verificationMethod: verificationMethodId(unsecured.issuer.id),
    proofPurpose: "assertionMethod",
  }) as SignedTreeHead;
}

export function treeHeadFromBlocks(
  blocks: LedgerBlock[],
  logDid: string,
  secretKey: Uint8Array,
  created = new Date().toISOString(),
): SignedTreeHead {
  const merkle = merkleRootFromBlockHashes(blocks.map((b) => b.blockHash));
  const last = blocks[blocks.length - 1];
  const unsecured = buildUnsecuredTreeHead({
    logDid,
    merkleRoot: merkle.merkleRoot,
    length: blocks.length,
    created,
    head: last ? { seq: last.seq, blockHash: last.blockHash } : undefined,
  });
  return signTreeHead(unsecured, secretKey);
}

export type TreeHeadCheck = {
  signatureValid: boolean;
  diplomaEvaluated: false;
  disclaimer: string;
  merkleRoot?: string;
  length?: number;
  logDid?: string;
  reason?: string;
};

export function verifyTreeHead(raw: unknown, expectedMerkleRoot?: string): TreeHeadCheck {
  const fail = (reason: string): TreeHeadCheck => ({
    signatureValid: false,
    diplomaEvaluated: false,
    disclaimer: STH_DISCLAIMER,
    reason,
  });
  if (!raw || typeof raw !== "object") return fail("Tree head must be a JSON object");
  const rec = raw as Record<string, unknown>;
  const types = rec.type;
  if (!Array.isArray(types) || !types.includes(STH_TYPE)) return fail("type must include SignedTreeHead");
  if (rec.format !== STH_FORMAT) return fail(`Unsupported STH format ${String(rec.format)}`);
  const issuer = rec.issuer as { id?: string } | undefined;
  const logDid = issuer?.id;
  if (!logDid || !logDid.startsWith("did:key:")) return fail("STH issuer must be did:key");
  let publicKey: Uint8Array;
  try {
    publicKey = decodeDidKey(logDid);
  } catch (err) {
    return fail((err as Error).message);
  }
  const proof = verifyDocumentProof(rec, publicKey);
  if (!proof.valid) return fail(proof.reason ?? "STH signature is invalid");
  const tree = rec.tree as { merkleRoot?: string; length?: number } | undefined;
  if (!tree?.merkleRoot?.startsWith("sha256:")) return fail("STH is missing merkleRoot");
  if (expectedMerkleRoot && expectedMerkleRoot !== tree.merkleRoot) {
    return fail("STH merkleRoot does not match the independently computed root");
  }
  if (rec.diplomaEvaluated === true) return fail("STH must not claim diplomaEvaluated");
  return {
    signatureValid: true,
    diplomaEvaluated: false,
    disclaimer: STH_DISCLAIMER,
    merkleRoot: tree.merkleRoot,
    length: tree.length,
    logDid,
  };
}

export { LEDGER_DIPLOMA_DISCLAIMER };
