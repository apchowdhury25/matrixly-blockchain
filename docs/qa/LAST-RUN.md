# QA last run

Base: `http://127.0.0.1:8080`
When: 2026-08-22T03:46:10.531Z
Result: **PASS** · 75 pass · 0 fail · 0 blocked

| ID | Title | Status | Notes |
|---|---|---|---|
| TC-1.1 | Original PDF | PASS | VALID + all required checks |
| TC-1.2 | One-byte tamper | PASS | INVALID; SHA-256 failed |
| TC-1.3 | Revoked | PASS | REVOKED |
| TC-1.4 | Expired | PASS | EXPIRED |
| TC-1.5 | Opaque link | PASS | /verify/demo-valid-bcs has no holder PII in the URL |
| TC-1.6 | Trust model | PASS | Trust model mentions ledger and hash |
| TC-2.1 | Public keys only (DID page) | PASS | did:key:z6MksTFUXzwu78R4… public |
| TC-2.2 | Public DID document | PASS | DID page, no secret |
| TC-2.3 | Rotation preserves old VCs | PASS | Covered by src/lib/identity/identity.test.ts (historical signatures) |
| TC-3.1 | PDF magic bytes accepted | PASS | PDF magic accepted |
| TC-3.2 | MZ rejected | PASS | MZ rejected |
| TC-3.3 | Dedup is hash identity | PASS | Covered by documents/evidence tests (same SHA-256) |
| TC-4.1 | Demo claim page | PASS | claim route loads |
| TC-4.2 | Wallet page | PASS | wallet route loads |
| TC-4.3 | Claim is not re-issuance | PASS | Covered by presentation tests (inner VC issuer proof) |
| TC-5.1 | Signed status list JSON | PASS | signed BitstringStatusListCredential |
| TC-5.2 | Revoke outcome via API | PASS | REVOKED |
| TC-6.1 | Signed report exists after verify | PASS | reportRef bpeo3GIa18lE |
| TC-6.2 | Audit hash-chain | PASS | Covered by src/lib/audit/chain.test.ts |
| TC-7.1 | Preview ledger is hash-chain | PASS | hashchain |
| TC-7.2 | Fabric refuse | PASS | unconfigured Fabric throws |
| TC-7.3 | Bytes off-chain | PASS | Covered by fabric.test.ts (no PDF in world state) |
| TC-8.1 | Missing API key | PASS | UNAUTHORIZED |
| TC-8.2 | Demo VALID | PASS | VALID + schemaAnchored |
| TC-8.3 | Tamper via API | PASS | not VALID |
| TC-8.4 | OpenAPI | PASS | openapi has /api/v1/verify |
| TC-9.1 | HMAC required | PASS | unsigned refused |
| TC-9.2 | Evidence 401 without key | PASS | 401 |
| TC-9.3 | Compliance matrix not a certificate | PASS | REG-01 not claimed |
| TC-10.1 | did:web document | PASS | hosted DID |
| TC-10.2 | did:web SSRF | PASS | loopback refused (webhook SSRF sibling; did:web tests cover DID fetch) |
| TC-10.3 | did:web demo credential | PASS | demo-valid-didweb VALID |
| TC-11.1 | OpenID4VP page | PASS | oid4vp loads |
| TC-11.2 | Nonce-bound VP (unit) | PASS | Covered by oid4vp.test.ts (nonce / replay) |
| TC-11.3 | Replay refused (unit) | PASS | Covered by oid4vp.test.ts |
| TC-11.4 | SD-JWT DCQL refused | PASS | Credential format dc+sd-jwt is not implemented (OpenID4VP W3C ldp_vc only) |
| TC-12.1 | OID4VCI metadata | PASS | ldp_vc only |
| TC-12.2 | OpenID4VCI page | PASS | oid4vci loads |
| TC-12.3 | Replay pre-auth (unit) | PASS | Covered by oid4vci persist tests — not run live (would consume the demo offer) |
| TC-12.4 | Authorization code refused | PASS | unsupported_grant_type |
| TC-12.5 | SD-JWT credential format refused | PASS | unsupported_credential_format |
| TC-13.1 | Status JSON | PASS | 200 |
| TC-13.2 | Schema page | PASS | schema page |
| TC-13.3 | Loopback status URL | PASS | Covered by status/resolve.test.ts (SSRF) |
| TC-13.4 | Unknown schema id | PASS | Covered by university-degree.test.ts |
| TC-14.1 | Ops page | PASS | ops |
| TC-14.2 | Liveness | PASS | ok |
| TC-14.3 | Readiness | PASS | hashchain |
| TC-14.4 | Cross-tenant export | PASS | denied |
| TC-14.5 | Rate limit never VALID | PASS | RATE_LIMITED path |
| TC-14.6 | AUDITOR cannot issue | PASS | false |
| TC-15.1 | Schema hash on page | PASS | sha256:a6673240e3edc32705801d2928a5ea07ff3ccb30df553c7bf36544d82f8b0400 |
| TC-15.2 | Hash header | PASS | sha256:a6673240e3edc32705801d2928a5ea07ff3ccb30df553c7bf36544d82f8b0400 |
| TC-15.3 | Demo schemaAnchored | PASS | VALID |
| TC-15.4 | Wrong ledger hash | PASS | Covered by engine.test.ts (schema hash mismatch → INVALID) |
| TC-15.5 | Readyz schemaAnchored | PASS | true |
| TC-15.6 | Tamper independent of schema | PASS | SHA-256 still fails |
| TC-16.1 | Team route | PASS | loads |
| TC-16.2 | Invite token format | PASS | mtx_inv_ hashed |
| TC-16.3 | Token hashed at rest | PASS | hash ≠ token |
| TC-16.4 | Last admin guard | PASS | throws |
| TC-16.5 | AUDITOR cannot issue | PASS | false |
| TC-16.6 | Invalid invite URL | PASS | 200 |
| TC-16.7 | ISSUER cannot manage members | PASS | false |
| TC-N.1 | SOC 2 not claimed | PASS | not-claimed |
| TC-N.2 | SD-JWT notes | PASS | refused |
| TC-N.3 | HAIP not claimed | PASS | not HAIP |
| TC-N.4 | No fake Fabric | PASS | hashchain |
| TC-17.1 | Chain export | PASS | length 265 |
| TC-17.2 | Independent recompute | PASS | chainValid |
| TC-17.3 | Tampered export fails | PASS | Payload hash mismatch at seq 1 |
| TC-17.4 | Chain page | PASS | 200 |
| TC-17.5 | Diploma still VALID | PASS | VALID |
| TC-17.6 | Wrong Merkle root | PASS | Merkle root does not match the recomputed RFC 6962 tree of block hashes |
| TC-AUTO.meta | OID4VCI metadata helper | PASS | ldp_vc |
