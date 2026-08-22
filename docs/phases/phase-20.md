# Phase 20 — Ledger receipt

**Status: implemented.** Completed 21 August 2026.

## What shipped

- `GET /api/v1/ledger/receipt?credentialHash=` returns `matrixly.receipt.v1`: inclusion proof + signed tree head.
- `POST /api/v1/ledger/receipt/verify` checks inclusion, STH signature, and that the two Merkle roots match.
- `receiptValid` is not diploma VALID (`diplomaEvaluated: false`).
- Proof from one tree and STH from another fails closed.
- Chain page shows the demo receipt.

## What is not claimed

- Certificate Transparency SCTs
- That a receipt means the diploma is VALID

## Tests

`src/lib/ledger/receipt.test.ts`
