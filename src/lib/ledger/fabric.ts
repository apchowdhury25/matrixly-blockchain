import type {
  CredentialLedgerRecord,
  CredentialStatusRecord,
  DidLedgerRecord,
  DistributedLedgerAdapter,
  DocumentAnchorRecord,
  IssuerLedgerRecord,
  LedgerSubmitResult,
} from "./adapter";

/**
 * Hyperledger Fabric Gateway adapter.
 *
 * This is a real integration boundary, not a stub that claims success.
 * It refuses to operate unless a Fabric Gateway connection is configured.
 * Application code must not catch this and treat credentials as anchored.
 */
export class FabricLedgerAdapter implements DistributedLedgerAdapter {
  readonly name = "FabricLedgerAdapter";
  private readonly endpoint?: string;

  constructor(endpoint?: string) {
    this.endpoint = endpoint;
  }

  private refuse(): never {
    throw new Error(
      `FabricLedgerAdapter is not connected${this.endpoint ? ` at ${this.endpoint}` : ""}. ` +
        "Configure a Hyperledger Fabric Gateway, then swap this adapter in. " +
        "Refusing to fake a blockchain transaction.",
    );
  }

  async registerIssuer(_record: IssuerLedgerRecord): Promise<LedgerSubmitResult> {
    this.refuse();
  }
  async registerDid(_record: DidLedgerRecord): Promise<LedgerSubmitResult> {
    this.refuse();
  }
  async registerCredential(_record: CredentialLedgerRecord): Promise<LedgerSubmitResult> {
    this.refuse();
  }
  async registerDocumentAnchor(_record: DocumentAnchorRecord): Promise<LedgerSubmitResult> {
    this.refuse();
  }
  async setCredentialStatus(_record: CredentialStatusRecord): Promise<LedgerSubmitResult> {
    this.refuse();
  }
  async getIssuer(_issuerId: string): Promise<IssuerLedgerRecord | null> {
    this.refuse();
  }
  async getDid(_did: string): Promise<DidLedgerRecord | null> {
    this.refuse();
  }
  async getCredential(_credentialId: string): Promise<CredentialLedgerRecord | null> {
    this.refuse();
  }
  async getDocumentAnchor(_documentHash: string): Promise<DocumentAnchorRecord | null> {
    this.refuse();
  }
  async getCredentialStatus(_credentialId: string): Promise<CredentialStatusRecord | null> {
    this.refuse();
  }
  async getLatestBlock(): Promise<{ seq: number; blockHash: string } | null> {
    this.refuse();
  }
  async verifyChain(): Promise<{ valid: boolean; length: number; reason?: string }> {
    this.refuse();
  }
}
