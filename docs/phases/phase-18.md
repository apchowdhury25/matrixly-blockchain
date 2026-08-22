# Phase 18 — Merkle inclusion proofs

**Status: implemented.** Completed 21 August 2026.

## What shipped

- RFC 6962 audit path over ordered `blockHash` values.
- `GET /api/v1/ledger/proof?credentialHash=` (or `seq=`) returns `matrixly.merkle-proof.v1`.
- `POST /api/v1/ledger/proof/verify` recomputes the path. Result is `included`, with `diplomaEvaluated: false`.
- The proof carries the CREDENTIAL block so `credentialHash` is bound by `payloadHash` → `blockHash` → Merkle root.
- Tampered siblings are not included.
- Chain page shows the demo diploma proof.

## What is not claimed

- Bitcoin / Fabric Merkle Patricia proofs
- That `included: true` means the diploma is VALID

## Tests

`src/lib/ledger/proof.test.ts` · `src/lib/ledger/merkle.test.ts`
