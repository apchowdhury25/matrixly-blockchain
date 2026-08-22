# ADR-021 Ledger receipt

## Context

Phases 17–19 shipped export, inclusion proofs, and a signed tree head as separate artifacts. A verifier had to stitch them.

## Decision

1. Publish `matrixly.receipt.v1` = proof + STH for one `credentialHash`.
2. Independent check requires `included`, `signatureValid`, and matching Merkle roots.
3. `receiptValid` is not diploma VALID.

## Consequences

- One JSON document is enough to check log membership against a pinned log DID.
- Signature, file hash, status list, and schema remain on `/api/v1/verify`.
