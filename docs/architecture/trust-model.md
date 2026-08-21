# Trust model

Verifier determination of authenticity:

1. W3C VC 2.0 structure
2. Issuer DID resolution (`did:key` locally, `did:web` over HTTPS; unsupported methods fail closed)
3. Issuer ACTIVE on the ledger (registry status is independent of DID method math)
4. Data Integrity proof (`eddsa-jcs-2022` over RFC 8785 JCS)
5. SHA-256 of supplied document bytes equals bound `documentHash` (filename is not evidence)
6. Document hash and credential hash exist as ledger payloads (no original bytes on-chain)
7. Hash chain recomputes from genesis
8. Bitstring Status List **credential** (signed) then the revocation bit
9. Verifier policy `matrixly.default.v1` (signed status list, issuer on ledger, ledger anchor, unrevoked)
10. If a presentation is supplied: holder DID resolves, holder `authentication` proof verifies, then the inner credential is verified independently
11. If `credentialSubject.id` is bound, it must equal the presenting holder DID
12. A signed VerificationReport is issued; its hash is ledger-anchored. Holder PII is not in the report.
13. Machine verifiers use `POST /api/v1/verify` with a hashed Bearer key. Missing keys return 401, never VALID.

A central `verified = true` column is never the source of truth.

Engineering controls (not a certification): [compliance matrix](../compliance/matrix.md).

Production cutover (Fabric Gateway, object storage, KMS) is specified in [Phase 7](../phases/phase-07.md). This preview uses `HashChainLedgerAdapter` unless `LEDGER_ADAPTER=fabric` is set, in which case a missing Gateway **refuses** — it does not fake a block.
