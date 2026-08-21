# ADR-008 Verifier API

## Context

Human verification (opaque QR / playground) is not enough for banks and employers. They need a machine endpoint. Returning `VALID` without authentication, or storing API secrets in plaintext, would fake security.

## Decision

1. API keys are bearer secrets (`mtx_live_`), hashed with SHA-256, shown once.
2. `POST /api/v1/verify` requires a valid key. 401 bodies set `verified: false` and never `VALID`.
3. The handler calls the same verification pipeline as the UI. It does not read a `verified` column.
4. Responses omit holder PII unless `includeSubject: true`.
5. Only `TENANT_ADMIN` may mint or revoke keys.

## Consequences

- Verifier integrations can run without an issuer session cookie.
- Compromised keys are revocable; prefix is the only display form.
- OpenAPI is the contract. UI playground remains for humans.
