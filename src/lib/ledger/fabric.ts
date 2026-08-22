import { sha256Utf8 } from "../crypto/hash";
import { canonicalize } from "../crypto/jcs";
import type {
  CredentialLedgerRecord,
  CredentialStatusRecord,
  DidLedgerRecord,
  DistributedLedgerAdapter,
  DocumentAnchorRecord,
  IssuerLedgerRecord,
  LedgerSubmitResult,
  SchemaLedgerRecord,
  VerificationAnchorRecord,
} from "./adapter";
import {
  FABRIC_PREVIOUS_UNAVAILABLE,
  fabricConfigured,
  fabricEnv,
  type GatewayContract,
} from "./gateway";
import type { LedgerBlock } from "./hash-chain";

/**
 * Hyperledger Fabric Gateway adapter.
 *
 * Uses @hyperledger/fabric-gateway when env is complete and the SDK is installed.
 * Tests may inject a GatewayContract double. Unconfigured instances refuse —
 * they never return a successful submit.
 */
export class FabricLedgerAdapter implements DistributedLedgerAdapter {
  readonly name = "FabricLedgerAdapter";
  readonly integrityModel = "fabric-endorsement" as const;
  private readonly endpoint?: string;
  private readonly contract?: GatewayContract;
  private lastSeq = 0;
  private lastTx?: string;

  constructor(options?: { endpoint?: string; contract?: GatewayContract }) {
    this.endpoint = options?.endpoint ?? fabricEnv().endpoint;
    this.contract = options?.contract;
  }

  static connect(contract?: GatewayContract): FabricLedgerAdapter {
    if (contract) return new FabricLedgerAdapter({ contract });
    if (!fabricConfigured()) {
      throw new Error(
        "LEDGER_ADAPTER=fabric but Fabric Gateway env is incomplete " +
          "(FABRIC_PEER_ENDPOINT, FABRIC_MSP_ID, FABRIC_CHANNEL, FABRIC_TLS_ROOT_CERT, " +
          "FABRIC_CLIENT_CERT, FABRIC_CLIENT_KEY). Refusing to fake a blockchain transaction.",
      );
    }
    throw new Error(
      `Fabric Gateway at ${fabricEnv().endpoint} is configured in env but this runtime ` +
        "does not open a live peer from the preview. Provide a GatewayContract " +
        "(tests / operator wiring) or keep LEDGER_ADAPTER=hashchain. " +
        "Refusing to fake a blockchain transaction.",
    );
  }

  private refuse(): never {
    throw new Error(
      `FabricLedgerAdapter is not connected${this.endpoint ? ` at ${this.endpoint}` : ""}. ` +
        "Configure a Hyperledger Fabric Gateway, then swap this adapter in. " +
        "Refusing to fake a blockchain transaction.",
    );
  }

  private requireContract(): GatewayContract {
    if (!this.contract) this.refuse();
    return this.contract;
  }

  private async submit(fn: string, record: Record<string, unknown>): Promise<LedgerSubmitResult> {
    const contract = this.requireContract();
    const submitted = await contract.submitAsync(fn, { arguments: [JSON.stringify(record)] });
    const status = await submitted.getStatus();
    if (!status.successful) {
      throw new Error(`Fabric commit failed tx=${status.transactionId} code=${status.code}`);
    }
    const timestamp = new Date().toISOString();
    const payloadHash = sha256Utf8(canonicalize({ kind: fn, record })).prefixed;
    this.lastSeq = Number(status.blockNumber);
    this.lastTx = status.transactionId;
    return {
      blockHash: `fabric:tx:${status.transactionId}`,
      seq: this.lastSeq,
      previousHash: FABRIC_PREVIOUS_UNAVAILABLE,
      payloadHash,
      timestamp,
    };
  }

  private async evaluate<T>(fn: string, id: string): Promise<T | null> {
    const contract = this.requireContract();
    try {
      const raw = await contract.evaluateTransaction(fn, id);
      const text = new TextDecoder().decode(raw);
      if (!text) return null;
      return JSON.parse(text) as T;
    } catch (err) {
      const message = (err as Error).message ?? "";
      if (message.includes("not found")) return null;
      throw err;
    }
  }

  async registerIssuer(record: IssuerLedgerRecord): Promise<LedgerSubmitResult> {
    return this.submit("RegisterIssuer", record as unknown as Record<string, unknown>);
  }
  async registerDid(record: DidLedgerRecord): Promise<LedgerSubmitResult> {
    return this.submit("RegisterDID", record as unknown as Record<string, unknown>);
  }
  async registerCredential(record: CredentialLedgerRecord): Promise<LedgerSubmitResult> {
    return this.submit("RegisterCredential", record as unknown as Record<string, unknown>);
  }
  async registerDocumentAnchor(record: DocumentAnchorRecord): Promise<LedgerSubmitResult> {
    return this.submit("RegisterDocumentAnchor", record as unknown as Record<string, unknown>);
  }
  async registerSchema(record: SchemaLedgerRecord): Promise<LedgerSubmitResult> {
    return this.submit("RegisterSchema", record as unknown as Record<string, unknown>);
  }
  async registerVerificationAnchor(record: VerificationAnchorRecord): Promise<LedgerSubmitResult> {
    return this.submit("RegisterVerificationAnchor", record as unknown as Record<string, unknown>);
  }
  async setCredentialStatus(record: CredentialStatusRecord): Promise<LedgerSubmitResult> {
    return this.submit("SetCredentialStatus", record as unknown as Record<string, unknown>);
  }
  async getIssuer(issuerId: string): Promise<IssuerLedgerRecord | null> {
    return this.evaluate<IssuerLedgerRecord>("GetIssuer", issuerId);
  }
  async getDid(did: string): Promise<DidLedgerRecord | null> {
    return this.evaluate<DidLedgerRecord>("GetDID", did);
  }
  async getCredential(credentialId: string): Promise<CredentialLedgerRecord | null> {
    return this.evaluate<CredentialLedgerRecord>("GetCredential", credentialId);
  }
  async getDocumentAnchor(documentHash: string): Promise<DocumentAnchorRecord | null> {
    return this.evaluate<DocumentAnchorRecord>("GetDocumentAnchor", documentHash);
  }
  async getSchema(schemaId: string): Promise<SchemaLedgerRecord | null> {
    return this.evaluate<SchemaLedgerRecord>("GetSchema", schemaId);
  }
  async getVerificationAnchor(reportHash: string): Promise<VerificationAnchorRecord | null> {
    return this.evaluate<VerificationAnchorRecord>("GetVerificationAnchor", reportHash);
  }
  async getCredentialStatus(credentialId: string): Promise<CredentialStatusRecord | null> {
    return this.evaluate<CredentialStatusRecord>("GetCredentialStatus", credentialId);
  }
  async getLatestBlock(): Promise<{ seq: number; blockHash: string } | null> {
    this.requireContract();
    if (!this.lastTx) return null;
    return { seq: this.lastSeq, blockHash: `fabric:tx:${this.lastTx}` };
  }
  async verifyChain(): Promise<{
    valid: boolean;
    length: number;
    reason?: string;
    model: "fabric-endorsement";
  }> {
    const contract = this.requireContract();
    try {
      await contract.evaluateTransaction("GetIssuer", "__health__");
    } catch (err) {
      const message = (err as Error).message ?? "";
      if (!message.includes("not found")) throw err;
    }
    return { valid: true, length: this.lastSeq, model: "fabric-endorsement" };
  }
  async listBlocks(): Promise<LedgerBlock[]> {
    this.requireContract();
    return [];
  }
}
