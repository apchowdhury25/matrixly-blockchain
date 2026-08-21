import { canonicalize } from "../crypto/jcs";
import { sha256Bytes, sha256Utf8 } from "../crypto/hash";
import type {
  CredentialLedgerRecord,
  CredentialStatusRecord,
  DidLedgerRecord,
  DistributedLedgerAdapter,
  DocumentAnchorRecord,
  IssuerLedgerRecord,
  LedgerRecordKind,
  LedgerSubmitResult,
  VerificationAnchorRecord,
} from "./adapter";

export const GENESIS_PREV =
  "sha256:0000000000000000000000000000000000000000000000000000000000000000";

export type LedgerPayload = {
  kind: LedgerRecordKind;
  record: Record<string, unknown>;
};

export type LedgerBlock = {
  seq: number;
  previousHash: string;
  timestamp: string;
  payload: LedgerPayload;
  payloadHash: string;
  blockHash: string;
};

export function payloadHashOf(payload: LedgerPayload): string {
  return sha256Utf8(canonicalize(payload)).prefixed;
}

export function computeBlockHash(input: {
  seq: number;
  previousHash: string;
  payloadHash: string;
  timestamp: string;
}): string {
  const material = new TextEncoder().encode(
    `${input.seq}|${input.previousHash}|${input.payloadHash}|${input.timestamp}`,
  );
  return sha256Bytes(material).prefixed;
}

export function verifyBlock(block: LedgerBlock, expectedPrevious: string): { valid: boolean; reason?: string } {
  if (block.previousHash !== expectedPrevious) {
    return { valid: false, reason: `Broken previous-hash link at seq ${block.seq}` };
  }
  const expectedPayload = payloadHashOf(block.payload);
  if (expectedPayload !== block.payloadHash) {
    return { valid: false, reason: `Payload hash mismatch at seq ${block.seq}` };
  }
  const expectedBlock = computeBlockHash({
    seq: block.seq,
    previousHash: block.previousHash,
    payloadHash: block.payloadHash,
    timestamp: block.timestamp,
  });
  if (expectedBlock !== block.blockHash) {
    return { valid: false, reason: `Block hash mismatch at seq ${block.seq}` };
  }
  return { valid: true };
}

export function verifyBlockSequence(blocks: LedgerBlock[]): {
  valid: boolean;
  length: number;
  reason?: string;
  model: "hash-chain";
} {
  let prev = GENESIS_PREV;
  for (const block of blocks) {
    const r = verifyBlock(block, prev);
    if (!r.valid) return { valid: false, length: blocks.length, reason: r.reason, model: "hash-chain" };
    prev = block.blockHash;
  }
  return { valid: true, length: blocks.length, model: "hash-chain" };
}

export type LedgerStore = {
  append(block: LedgerBlock): Promise<void>;
  all(): Promise<LedgerBlock[]>;
};

/** In-memory append-only log. Used by tests and as the live adapter backing. */
export class MemoryLedgerStore implements LedgerStore {
  readonly blocks: LedgerBlock[] = [];
  async append(block: LedgerBlock): Promise<void> {
    this.blocks.push(block);
  }
  async all(): Promise<LedgerBlock[]> {
    return this.blocks.slice();
  }
}

export class HashChainLedgerAdapter implements DistributedLedgerAdapter {
  readonly name = "HashChainLedgerAdapter";
  readonly integrityModel = "hash-chain" as const;
  private readonly store: LedgerStore;

  constructor(store: LedgerStore) {
    this.store = store;
  }

  async registerIssuer(record: IssuerLedgerRecord): Promise<LedgerSubmitResult> {
    const existing = await this.getIssuer(record.issuerDid);
    if (existing) {
      const latest = await this.getLatestBlock();
      if (!latest) throw new Error("Issuer exists without ledger head");
      return {
        blockHash: latest.blockHash,
        seq: latest.seq,
        previousHash: latest.blockHash,
        payloadHash: latest.blockHash,
        timestamp: new Date().toISOString(),
      };
    }
    return this.commit("ISSUER", record as unknown as Record<string, unknown>);
  }

  async registerDid(record: DidLedgerRecord): Promise<LedgerSubmitResult> {
    const existing = await this.getDid(record.did);
    if (existing) {
      const latest = await this.getLatestBlock();
      if (!latest) throw new Error("DID exists without ledger head");
      return {
        blockHash: latest.blockHash,
        seq: latest.seq,
        previousHash: latest.blockHash,
        payloadHash: latest.blockHash,
        timestamp: new Date().toISOString(),
      };
    }
    return this.commit("DID", record as unknown as Record<string, unknown>);
  }

  async registerCredential(record: CredentialLedgerRecord): Promise<LedgerSubmitResult> {
    const existing = await this.getCredential(record.credentialId);
    if (existing) throw new Error("Credential already registered");
    return this.commit("CREDENTIAL", record as unknown as Record<string, unknown>);
  }

  async registerDocumentAnchor(record: DocumentAnchorRecord): Promise<LedgerSubmitResult> {
    const existing = await this.getDocumentAnchor(record.documentHash);
    if (existing) {
      const latest = await this.getLatestBlock();
      if (!latest) throw new Error("Document anchor exists without ledger head");
      return {
        blockHash: latest.blockHash,
        seq: latest.seq,
        previousHash: latest.blockHash,
        payloadHash: latest.blockHash,
        timestamp: new Date().toISOString(),
      };
    }
    return this.commit("DOCUMENT_ANCHOR", record as unknown as Record<string, unknown>);
  }

  async registerVerificationAnchor(record: VerificationAnchorRecord): Promise<LedgerSubmitResult> {
    return this.commit("VERIFICATION_ANCHOR", record as unknown as Record<string, unknown>);
  }

  async setCredentialStatus(record: CredentialStatusRecord): Promise<LedgerSubmitResult> {
    const cred = await this.getCredential(record.credentialId);
    if (!cred) throw new Error("Unknown credential");
    return this.commit("CREDENTIAL_STATUS", record as unknown as Record<string, unknown>);
  }

  async getIssuer(issuerId: string): Promise<IssuerLedgerRecord | null> {
    return this.latestOf<IssuerLedgerRecord>(
      "ISSUER",
      (r) => r.issuerId === issuerId || r.issuerDid === issuerId,
    );
  }

  async getDid(did: string): Promise<DidLedgerRecord | null> {
    return this.latestOf<DidLedgerRecord>("DID", (r) => r.did === did);
  }

  async getCredential(credentialId: string): Promise<CredentialLedgerRecord | null> {
    const base = await this.latestOf<CredentialLedgerRecord>(
      "CREDENTIAL",
      (r) => r.credentialId === credentialId,
    );
    if (!base) return null;
    const status = await this.getCredentialStatus(credentialId);
    if (!status) return base;
    return { ...base, status: status.status };
  }

  async getDocumentAnchor(documentHash: string): Promise<DocumentAnchorRecord | null> {
    return this.latestOf<DocumentAnchorRecord>(
      "DOCUMENT_ANCHOR",
      (r) => r.documentHash === documentHash,
    );
  }

  async getVerificationAnchor(reportHash: string): Promise<VerificationAnchorRecord | null> {
    return this.latestOf<VerificationAnchorRecord>(
      "VERIFICATION_ANCHOR",
      (r) => r.reportHash === reportHash,
    );
  }

  async getCredentialStatus(credentialId: string): Promise<CredentialStatusRecord | null> {
    return this.latestOf<CredentialStatusRecord>(
      "CREDENTIAL_STATUS",
      (r) => r.credentialId === credentialId,
    );
  }

  async getLatestBlock(): Promise<{ seq: number; blockHash: string } | null> {
    const blocks = await this.store.all();
    const last = blocks[blocks.length - 1];
    return last ? { seq: last.seq, blockHash: last.blockHash } : null;
  }

  async verifyChain() {
    return verifyBlockSequence(await this.store.all());
  }

  async listBlocks(): Promise<LedgerBlock[]> {
    return this.store.all();
  }

  private async latestOf<T>(
    kind: LedgerRecordKind,
    pred: (r: T) => boolean,
  ): Promise<T | null> {
    const blocks = await this.store.all();
    for (let i = blocks.length - 1; i >= 0; i--) {
      const b = blocks[i]!;
      if (b.payload.kind !== kind) continue;
      const rec = b.payload.record as T;
      if (pred(rec)) return rec;
    }
    return null;
  }

  private async commit(
    kind: LedgerRecordKind,
    record: Record<string, unknown>,
    timestamp = new Date().toISOString(),
  ): Promise<LedgerSubmitResult> {
    const blocks = await this.store.all();
    const last = blocks[blocks.length - 1];
    const seq = (last?.seq ?? 0) + 1;
    const previousHash = last?.blockHash ?? GENESIS_PREV;
    const payload: LedgerPayload = { kind, record };
    const payloadHash = payloadHashOf(payload);
    const blockHash = computeBlockHash({ seq, previousHash, payloadHash, timestamp });
    const block: LedgerBlock = { seq, previousHash, timestamp, payload, payloadHash, blockHash };
    const check = verifyBlock(block, previousHash);
    if (!check.valid) throw new Error(check.reason);
    await this.store.append(block);
    return { blockHash, seq, previousHash, payloadHash, timestamp };
  }
}
