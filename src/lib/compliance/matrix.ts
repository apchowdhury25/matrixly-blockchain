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
    evidence: "/did-web/{slug} and GET /api/v1/did-web/{slug}; did:ion remains unsupported",
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
    id: "STS-02",
    area: "Status",
    control: "Status list is resolved from credentialStatus.statusListCredential URL; SSRF blocked",
    status: "implemented",
    evidence: "GET /credentials/status/{id}; verifier does not use a side-channel issuer_id lookup",
  },
  {
    id: "SCH-01",
    area: "Schema",
    control: "W3C credentialSchema JsonSchema for UniversityDegreeCredential; unknown ids fail closed",
    status: "implemented",
    evidence: "/schemas/university-degree-credential.json",
  },
  {
    id: "SCH-02",
    area: "Schema",
    control: "Published JsonSchema is hashed (JCS SHA-256) and registered on the ledger",
    status: "implemented",
    evidence: "registerSchema; schemaAnchored check; x-schema-hash",
  },
  {
    id: "SCH-03",
    area: "Schema",
    control: "Credential instances are validated against the published JsonSchema at issue and verify; mismatch is INVALID",
    status: "implemented",
    evidence: "validateAgainstSchema; schemaValid; issue refuses unknown schema ids",
  },
  {
    id: "LGL-01",
    area: "Legal",
    control: "Verification results are not a legal determination; limitation of liability is published",
    status: "implemented",
    evidence: "/legal ; notices.liability on verifier API; not attorney-reviewed",
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
    id: "DLT-03",
    area: "Ledger",
    control: "Hash-chain can be exported and recomputed independently; export is not a credential VALID",
    status: "implemented",
    evidence: "GET /api/v1/ledger/chain ; POST /api/v1/ledger/verify ; RFC 6962 merkleRoot ; /chain",
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
    id: "API-02",
    area: "Access",
    control: "Verifier API rate limits return 429 RATE_LIMITED, never VALID",
    status: "implemented",
    evidence: "Per-key sliding window; Retry-After",
  },
  {
    id: "TEN-01",
    area: "Tenancy",
    control: "Issuer data and verification exports are tenant-scoped; AUDITOR cannot issue",
    status: "implemented",
    evidence: "canExportVerification; RBAC; 404 not 200 across tenants",
  },
  {
    id: "TEN-02",
    area: "Tenancy",
    control: "TENANT_ADMIN invites hashed email tokens; last admin cannot be removed; AUDITOR cannot issue",
    status: "implemented",
    evidence: "/app/team ; invite tokens hashed; last-admin guard",
  },
  {
    id: "OPS-01",
    area: "Operations",
    control: "Liveness and readiness are distinct; missing Fabric Gateway is not ready",
    status: "implemented",
    evidence: "GET /healthz ; GET /readyz ; /ops",
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
    evidence: "This matrix is an engineering control list, not an audit opinion. See /soc2",
  },
  {
    id: "OID-01",
    area: "Interop",
    control: "OpenID4VP 1.0 direct_post + DCQL; nonce bound in Data Integrity challenge",
    status: "implemented",
    evidence: "/oid4vp ; vp_token object; SD-JWT/mdoc refused",
  },
  {
    id: "OID-02",
    area: "Interop",
    control: "HAIP / SD-JWT VC / ISO mdoc certification",
    status: "not-claimed",
    evidence: "Unsupported formats fail closed and never return VALID. Notes: /sd-jwt",
  },
  {
    id: "OID-03",
    area: "Interop",
    control: "OpenID4VCI 1.0 pre-authorized_code delivers an already-signed W3C ldp_vc",
    status: "implemented",
    evidence: "/oid4vci ; /.well-known/openid-credential-issuer ; authorization_code refused",
  },
];
