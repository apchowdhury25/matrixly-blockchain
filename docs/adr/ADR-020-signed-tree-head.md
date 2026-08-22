# ADR-020 Signed tree head

## Context

Phases 17–18 published a Merkle root and inclusion proofs. The root itself was unsigned JSON from this application.

## Decision

1. Sign `{ merkleRoot, length, genesis, head }` as a Data Integrity document (`SignedTreeHead`).
2. Use the platform `did:key` already used for verification reports (KMS-wrapped).
3. Do not implement Certificate Transparency gossip, SCTs, or Chrome log lists.
4. `signatureValid` is not diploma VALID.

## Consequences

- A verifier can pin the log DID and reject a swapped Merkle root.
- Diploma checks remain on `POST /api/v1/verify`.
