# ADR-003 Document ingestion and evidence

## Context

Phase 1 hashed generated diploma PDFs at issuance. There was no ingest path, no evidence package, and document anchors were not idempotent. Filenames could have been mistaken for evidence.

## Decision

1. **Bytes are the document.** SHA-256 is taken over the exact octet string after magic-byte inspection. Filename, declared MIME, and extension are ignored.
2. **Evidence is off-chain.** The application database (PGLite / Postgres) stores original bytes in this runtime. That is off-chain storage, not a ledger. The ledger receives only `documentHash`, optional `credentialId`, and `issuerDid`.
3. **Ingest and issue are separate.** Upload produces a `HASHED` document. Issuance binds a VC to that hash and marks the document `ISSUED`. The same hash in a tenant is deduplicated.
4. **ZIP and executables fail closed.** `%PDF`, PNG, JPEG, and JSON objects/arrays are the allowed kinds.
5. **Document anchors are idempotent** by hash so a second issue attempt cannot mint a second existence proof for the same bytes.

## Alternatives

- Hash the filename plus bytes. Rejected: names are not authentic.
- Put PDFs on Fabric. Rejected: the chaincode stores hashes only.
- Fake `verifyDocument() { return true }`. Rejected.

## Consequences

- A verifier who supplies different bytes than those hashed at ingest gets `INVALID`.
- Object storage (S3, IPFS) can replace `content_b64` later behind the same evidence type.
