# Phase 8 — Verifier API

**Status: implemented.** Completed 21 August 2026.

Phases 1–7 let a human verifier decide authenticity from cryptographic evidence. Phase 8 is the same pipeline for **machines**: banks, employers, and registries that cannot click the playground.

## What shipped

- Hashed verifier API keys (`mtx_live_…`). Secret shown once. SHA-256 at rest.
- `POST /api/v1/verify` — Bearer required. Missing key → **401**, never `VALID`.
- Body: opaque `ref`, posted `credential`, or `presentation`. Optional document bytes.
- Default JSON omits holder names (`includeSubject` is opt-in).
- `GET /api/v1/reports/{ref}` — signed report + ledger anchor flag.
- `GET /api/v1/openapi.json`
- Issuer **API keys** console (`TENANT_ADMIN` only)
- Public **Developers** documentation

## What did not change

- Verification algorithm (still `verifyCredential` / `verifyPresentation`)
- Ledger adapter (still hash-chain in this preview; Fabric still refuses without a Gateway)
- Public UI verify links (still work without an API key — humans vs machines)

## Tests

`src/lib/api/keys.test.ts` plus RBAC `manageApiKeys` in `identity.test.ts`.
