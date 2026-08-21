# Phase 3 — Documents

Completed 21 August 2026.

## What was implemented

- Document evidence package: inspect → SHA-256 of exact bytes → off-chain store
- Ingest API and issuer Documents UI (upload, list, download, issue from hash)
- Issue flow can generate a diploma **or** bind an uploaded/hashed document
- Tenant-scoped dedup by `(tenant_id, hash)`
- Ledger document anchors are idempotent and never contain original bytes
- Fabric chaincode `RegisterDocumentAnchor` / `GetDocumentAnchor` (hash only)
- Schema `0004_documents.sql`

## Tests

`npm run test:trust` includes `src/lib/documents/evidence.test.ts`:

- Magic bytes, not filenames
- ZIP / MZ rejected
- One-byte mutation changes the hash
- Ledger serialization contains the hash and not the PDF bytes
- Tampered bytes fail verification
- Document anchor idempotency

## Not in this phase

- S3 / IPFS object storage adapter
- Malware scanning beyond type/size/magic checks
- Phase 4 (holder wallet / credential delivery)
