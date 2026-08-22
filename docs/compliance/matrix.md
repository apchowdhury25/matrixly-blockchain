# Compliance control matrix

This is an **engineering control list**, not a SOC 2, ISO 27001, eIDAS, GDPR, or OpenID certification. Listing a control as implemented means the runtime enforces it and tests cover it. It is not an audit opinion.

Live page: **Compliance** in the product header (`/compliance`). Source of truth for the table below: `src/lib/compliance/matrix.ts`.

## Status legend

| Status | Meaning |
|---|---|
| `implemented` | The control is in the running product and has tests or a live check. |
| `fail-closed` | The capability exists as a port. Missing real config **refuses**; it does not pretend to succeed. |
| `not-claimed` | We do not assert this. A verifier must not treat the product as satisfying it. |

A green badge that skipped a failed cryptographic check is a defect, not a control.

## Matrix

| ID | Area | Control | Status | Evidence |
|---|---|---|---|---|
| CRY-01 | Cryptography | W3C VC 2.0 with Data Integrity `eddsa-jcs-2022` (Ed25519) | implemented | Verification pipeline verifies the proof over RFC 8785 JCS |
| CRY-02 | Cryptography | Document authenticity is SHA-256 of exact bytes, not the filename | implemented | Magic-byte ingest + hash mismatch → INVALID |
| ID-01 | Identity | Issuer identified by `did:key`; rotation preserves historical signatures | implemented | Keys page; rotated DID remains verifiable |
| ID-02 | Identity | Signing secrets sealed (AES-256-GCM / KMS port); APIs never return them | implemented | LocalAesGcmKms; AWS KMS refuses without key id |
| ID-03 | Identity | `did:web` documents are fetched over HTTPS; private/link-local hosts fail closed | implemented | `/did-web/{slug}` and `GET /api/v1/did-web/{slug}`; `did:ion` remains unsupported |
| ID-04 | Identity | Universal DID resolver / `did:ion` / `did:pkh` | not-claimed | Unsupported methods return a resolution error, never VALID |
| STS-01 | Status | Revocation via signed Bitstring Status List 1.0, not a database flag alone | implemented | Signed status list credential + bit |
| STS-02 | Status | Status list is resolved from `credentialStatus.statusListCredential` URL; SSRF blocked | implemented | `GET /credentials/status/{id}` |
| SCH-01 | Schema | W3C credentialSchema JsonSchema for UniversityDegreeCredential; unknown ids fail closed | implemented | `/schemas/university-degree-credential.json` |
| DLT-01 | Ledger | Hashes and DIDs on an append-only ledger; original files stay off-chain | implemented | HashChainLedgerAdapter; document bytes in object storage |
| DLT-02 | Ledger | Hyperledger Fabric is not faked; missing Gateway fails closed | fail-closed | FabricLedgerAdapter throws; never returns a successful submit |
| PII-01 | Privacy | Opaque verify links; machine API omits holder names by default | implemented | `includeSubject` is opt-in; reports exclude holder PII |
| API-01 | Access | Verifier API requires hashed Bearer keys; 401 never returns VALID | implemented | `POST /api/v1/verify` |
| API-02 | Access | Verifier API rate limits return 429 RATE_LIMITED, never VALID | implemented | Per-key sliding window; Retry-After |
| TEN-01 | Tenancy | Issuer data and verification exports are tenant-scoped; AUDITOR cannot issue | implemented | `canExportVerification`; RBAC; 404 across tenants |
| OPS-01 | Operations | Liveness and readiness are distinct; missing Fabric Gateway is not ready | implemented | `GET /healthz` ; `GET /readyz` ; `/ops` |
| WH-01 | Integrity | Outbound verification events are HMAC-SHA256 signed; unsigned events are refused | implemented | Webhook deliveries; secret sealed at rest |
| AUD-01 | Audit | Signed verification reports anchored by hash; tenant audit is hash-chained | implemented | VerificationReport + `audit_events.prev_hash` |
| REG-01 | Regulation | SOC 2 / ISO 27001 / eIDAS / GDPR certification of this deployment | not-claimed | Engineering control list, not an audit opinion. Investigation: `/soc2` |
| OID-01 | Interop | OpenID4VP 1.0 `direct_post` + DCQL; nonce bound in Data Integrity challenge | implemented | `/oid4vp` ; `vp_token` object; SD-JWT/mdoc refused |
| OID-02 | Interop | HAIP / SD-JWT VC / ISO mdoc certification | not-claimed | Unsupported formats fail closed and never return VALID. Notes: `/sd-jwt` |
| OID-03 | Interop | OpenID4VCI 1.0 pre-authorized_code delivers an already-signed W3C `ldp_vc` | implemented | `/oid4vci` ; `/.well-known/openid-credential-issuer` ; authorization_code refused |

## How to read REG-01

`not-claimed` is the correct result. Do not score the product as FAIL because it is not SOC 2 certified. Score FAIL only if the **Compliance** page or this document asserts a certification.

## Related

- Trust model: [../architecture/trust-model.md](../architecture/trust-model.md)
- Protocol standards: [../architecture/protocol-standards.md](../architecture/protocol-standards.md)
- QA: [../qa.md](../qa.md)
