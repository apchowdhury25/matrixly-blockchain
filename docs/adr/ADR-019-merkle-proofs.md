# ADR-019 Merkle inclusion proofs

## Context

Phase 17 published a Merkle root over the hash-chain. A verifier still had to download every block to see whether a credential hash was present.

## Decision

1. Publish RFC 6962 audit paths (`matrixly.merkle-proof.v1`).
2. Include the CREDENTIAL block so payload hash, block hash, and claimed `credentialHash` can be checked independently.
3. `included` is not diploma VALID. `diplomaEvaluated` is always false.
4. Fabric proofs fail closed without Gateway data.

## Consequences

- A verifier with a trusted Merkle root can check membership in O(log n) hashes.
- Signature, file SHA-256, status list, and schema still have to pass on `/api/v1/verify`.
