# ADR-007 Production adapters (Phase 7)

## Status

Accepted as the implementation contract. **Not yet built.**

## Context

The verification pipeline is complete (Phases 1–6). The remaining production gap is infrastructure: a real Fabric network, object storage for original bytes, and KMS for wrapping Ed25519 secrets. The application already has a ledger port (`DistributedLedgerAdapter`) and a Fabric class that refuses to fake transactions.

## Decision

1. Keep `DistributedLedgerAdapter` as the only way application code talks to a ledger.
2. Select the implementation with `LEDGER_ADAPTER`. Default remains `hashchain`.
3. Fabric uses the Gateway SDK against `document-registry`. Missing config throws.
4. Object storage and KMS get the same adapter treatment. Preview keeps database bytes and local AES.
5. One ledger is authoritative per deployment. Replay hashes onto Fabric, then cut over — do not dual-write as two sources of truth.
6. Fabric `verifyChain` is endorsement/query integrity, not a SHA-256 genesis walk. The UI must name the adapter.

## Consequences

- Preview and CI stay runnable without Docker Fabric.
- Production cannot silently degrade to hash-chain while claiming DLT.
- Chaincode must grow `SetCredentialStatus` and verification-report anchors before the adapter can be complete.

Details: [docs/phases/phase-07.md](../phases/phase-07.md)
