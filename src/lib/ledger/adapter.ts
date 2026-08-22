/**
 * Distributed ledger port. The rest of the application never imports a Fabric SDK.
 *
 * Implementations:
 * - HashChainLedgerAdapter — cryptographically linked append-only log (this runtime)
 * - FabricLedgerAdapter    — Hyperledger Fabric Gateway (requires a running network)
 *
 * Neither implementation may short-circuit verification to `return true`.
 */
export type LedgerRecordKind =
  | "ISSUER"
  | "CREDENTIAL"
  | "DOCUMENT_ANCHOR"
  | "CREDENTIAL_STATUS"
  | "SCHEMA"
  | "DID"
  | "VERIFICATION_ANCHOR";

export type IssuerLedgerRecord = {
  issuerId: string;
  issuerDid: string;
  name: string;
  status: "PENDING" | "UNDER_REVIEW" | "ACTIVE" | "SUSPENDED" | "REVOKED";
  publicKeyMultibase: string;
};

export type CredentialLedgerRecord = {
  credentialId: string;
  credentialHash: string;
  documentHash: string;
  issuerId: string;
  issuerDid: string;
  schemaId?: string;
  status: "ACTIVE" | "REVOKED" | "EXPIRED" | "SUPERSEDED" | "SUSPENDED";
  issuedAt: string;
  expiresAt?: string;
  version: number;
};

export type DocumentAnchorRecord = {
  documentHash: string;
  credentialId?: string;
  issuerDid: string;
};

export type DidLedgerRecord = {
  did: string;
  documentHash: string;
  publicKeyMultibase: string;
  status: "ACTIVE" | "ROTATED" | "REVOKED";
  controllerDid?: string;
};

export type CredentialStatusRecord = {
  credentialId: string;
  status: CredentialLedgerRecord["status"];
  reason?: string;
  at: string;
};

export type SchemaLedgerRecord = {
  schemaId: string;
  schemaHash: string;
  schemaType: "JsonSchema";
  status: "ACTIVE" | "SUPERSEDED";
};

export type VerificationAnchorRecord = {
  reportId: string;
  reportHash: string;
  credentialHash: string;
  resultStatus: string;
  verifierDid: string;
  at: string;
};

export type ChainIntegrity = {
  valid: boolean;
  length: number;
  reason?: string;
  model: "hash-chain" | "fabric-endorsement";
};

export type LedgerSubmitResult = {
  blockHash: string;
  seq: number;
  previousHash: string;
  payloadHash: string;
  timestamp: string;
};

export interface DistributedLedgerAdapter {
  readonly name: string;
  registerIssuer(record: IssuerLedgerRecord): Promise<LedgerSubmitResult>;
  registerDid(record: DidLedgerRecord): Promise<LedgerSubmitResult>;
  registerCredential(record: CredentialLedgerRecord): Promise<LedgerSubmitResult>;
  registerDocumentAnchor(record: DocumentAnchorRecord): Promise<LedgerSubmitResult>;
  registerSchema(record: SchemaLedgerRecord): Promise<LedgerSubmitResult>;
  registerVerificationAnchor(record: VerificationAnchorRecord): Promise<LedgerSubmitResult>;
  setCredentialStatus(record: CredentialStatusRecord): Promise<LedgerSubmitResult>;
  getIssuer(issuerId: string): Promise<IssuerLedgerRecord | null>;
  getDid(did: string): Promise<DidLedgerRecord | null>;
  getCredential(credentialId: string): Promise<CredentialLedgerRecord | null>;
  getDocumentAnchor(documentHash: string): Promise<DocumentAnchorRecord | null>;
  getSchema(schemaId: string): Promise<SchemaLedgerRecord | null>;
  getVerificationAnchor(reportHash: string): Promise<VerificationAnchorRecord | null>;
  getCredentialStatus(credentialId: string): Promise<CredentialStatusRecord | null>;
  getLatestBlock(): Promise<{ seq: number; blockHash: string } | null>;
  verifyChain(): Promise<ChainIntegrity>;
}
