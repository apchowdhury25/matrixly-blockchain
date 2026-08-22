# Phase 19 — Signed tree head

**Status: implemented.** Completed 21 August 2026.

## What shipped

- `GET /api/v1/ledger/sth` returns a `SignedTreeHead` (`matrixly.sth.v1`) with Data Integrity `eddsa-jcs-2022` over the Merkle root, length, and genesis.
- `POST /api/v1/ledger/sth/verify` checks the signature. Result is `signatureValid`, with `diplomaEvaluated: false`.
- Tampered `tree.merkleRoot` fails the proof.
- Optional `?merkleRoot=` on verify binds the STH to an independently computed root.
- Chain page shows the log DID. Fabric STHs fail closed.

## What is not claimed

- Certificate Transparency (RFC 6962 STH / Chrome CT logs)
- That a signed root means a diploma is VALID

## Tests

`src/lib/ledger/sth.test.ts`
