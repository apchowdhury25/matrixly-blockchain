# Matrixly Trust

Enterprise document and credential verification. Cryptographic evidence, not a database checkbox.

This repository is the runnable Matrixly Trust platform: W3C Verifiable Credentials 2.0, Ed25519 Data Integrity proofs, SHA-256 document binding, Bitstring Status List revocation, and an append-only hash-chained ledger. Hyperledger Fabric is a first-class adapter that refuses to fake transactions.

## What you can do

- Verify the Global University demo diploma (valid, one-byte tamper, revoked, expired)
- Sign in as an issuer and issue a new diploma
- Inspect the ledger hash chain and public keys
- Open an opaque QR verification link with no PII in the code

## Trust chain

Document → SHA-256 → VC 2.0 → Ed25519 → ledger anchor → verification → status → audit

## Commands

```bash
npm install
npm run dev
npm run build
npm run lint
npm run typecheck
npm test
```

## Security notes

- Original PDFs stay off-chain
- Signing keys are AES-256-GCM sealed and never returned by the API
- Tenant-scoped issuer APIs; public verify uses opaque references only
- `FabricLedgerAdapter` throws if no Fabric Gateway is configured
