# Phase 17 — Independent ledger export

**Status: implemented.** Completed 21 August 2026.

## What shipped

- Public `GET /api/v1/ledger/chain` dumps the hash-chain (`matrixly.ledger.v1`) including an RFC 6962 Merkle root over block hashes.
- `POST /api/v1/ledger/verify` recomputes previous-hash, payload hash, and block hash. Result is `chainValid`, **not** credential `VALID`.
- `/chain` page to download and paste an export.
- Tampered payload fails independent check.
- Fabric-model export fails closed (no fake Gateway blocks).
- Holder PII must not appear in the dump.

## What is not claimed

- A live Hyperledger Fabric block export
- That chain integrity alone means a diploma is VALID (status list, signature, and file hash still apply)

## Tests

`src/lib/ledger/export.test.ts`
