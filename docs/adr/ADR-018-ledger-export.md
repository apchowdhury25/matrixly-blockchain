# ADR-018 Independent hash-chain export

## Context

Verification already checks `ledgerProof` inside this process. A verifier still had to trust our API to say the chain was intact.

## Decision

1. Publish the exact hash-chain blocks (`matrixly.ledger.v1`).
2. Offer a pure recompute (`verifyExportedChain`) that does not write and does not return credential VALID.
3. Refuse Fabric dumps without Gateway block data.
4. Fail the export if holder PII is present.
5. Include an RFC 6962 SHA-256 Merkle root over ordered `blockHash` values. A wrong root is not `chainValid`. This is not a Bitcoin Merkle tree and not a Fabric world-state trie.

## Consequences

- Anyone can recompute `blockHash` from `seq | previousHash | payloadHash | timestamp`.
- Chain integrity is necessary but not sufficient for a VALID diploma.
