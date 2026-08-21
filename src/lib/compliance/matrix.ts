export type ControlStatus = "implemented" | "fail-closed" | "not-claimed";

export type ComplianceControl = {
  id: string;
  area: string;
  control: string;
  status: ControlStatus;
  evidence: string;
};

/** Honest matrix. Not a certification, audit opinion, or regulatory attestation. */
export const COMPLIANCE_MATRIX: ComplianceControl[] = [
  {
    id: "CRY-01",
    area: "Cryptography",
    control: "W3C VC 2.0 with Data Integrity eddsa-jcs-2022 (Ed25519)",
    status: "implemented",
    evidence: "Verification pipeline verifies the proof over RFC 8785 JCS",
  },
  {
    id: "CRY-02",
    area: "Cryptography",
    control: "Document authenticity is SHA-256 of exact bytes, not the filename",
    status: "implemented",
    evidence: "Magic-byte ingest + hash mismatch → INVALID",
  },
  {
    id: "ID-01",
    area: "Identity",
    control: "Issuer identified by did:key; rotation preserves historical signatures",
    status: "implemented",
    evidence: "Keys page; rotated DID remains verifiable",
  },
  {
    id: "ID-03",
    area: "Identity",
    control: "did:web documents are fetched over HTTPS; private/link-local hosts fail closed",
    status: "implemented",
    evidence: "/issuers/{slug}/did.json ; did:ion and others remain unsupported",
  },
  {
    id: "ID-04",
    area: "Identity",
    control: "Universal DID resolver / did:ion / did:pkh",
    status: "not-claimed",
    evidence: "Unsupported methods return a resolution error, never VALID",
  },
  {
    id: "ID-02",
    area: "Identity",
    control: "Signing secrets sealed (AES-256-GCM / KMS port); APIs never return them",
    status: "implemented",
    evidence: "LocalAesGcmKms; AWS KMS refuses without key id",
  },
  {
    id: "STS-01",
    area: "Status",
    control: "Revocation via signed Bitstring Status List 1.0, not a database flag alone",
    status: "implemented",
    evidence: "Signed status list credential + bit",
  },
  {
    id: "DLT-01",
    area: "Ledger",
    control: "Hashes and DIDs on an append-only ledger; original files stay off-chain",
    status: "implemented",
    evidence: "HashChainLedgerAdapter; document bytes in object storage",
  },
  {
    id: "DLT-02",
    area: "Ledger",
    control: "Hyperledger Fabric is not faked; missing Gateway fails closed",
    status: "fail-closed",
    evidence: "FabricLedgerAdapter throws; never returns a successful submit",
  },
  {
    id: "PII-01",
    area: "Privacy",
    control: "Opaque verify links; machine API omits holder names by default",
    status: "implemented",
    evidence: "includeSubject is opt-in; reports exclude holder PII",
  },
  {
    id: "API-01",
    area: "Access",
    control: "Verifier API requires hashed Bearer keys; 401 never returns VALID",
    status: "implemented",
    evidence: "POST /api/v1/verify",
  },
  {
    id: "WH-01",
    area: "Integrity",
    control: "Outbound verification events are HMAC-SHA256 signed; unsigned events are refused",
    status: "implemented",
    evidence: "Webhook deliveries; secret sealed at rest",
  },
  {
    id: "AUD-01",
    area: "Audit",
    control: "Signed verification reports anchored by hash; tenant audit is hash-chained",
    status: "implemented",
    evidence: "VerificationReport + audit_events.prev_hash",
  },
  {
    id: "REG-01",
    area: "Regulation",
    control: "SOC 2 / ISO 27001 / eIDAS / GDPR certification of this deployment",
    status: "not-claimed",
    evidence: "This matrix is an engineering control list, not an audit opinion",
  },
];
