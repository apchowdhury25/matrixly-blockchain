# ADR-015 Tenant-scoped exports, rate limits, distinct liveness/readiness

## Context

Any hashed API key could fetch any evidence pack by ref. Liveness was not published. There was no rate limit on `/api/v1/verify`.

## Decision

1. Machine **exports** require the issuer tenant or the verifying key. Do not return 403 with a distinct body that proves the ref exists — use 404.
2. Public `/evidence/{opaque}` stays a capability URL (the secret is the ref).
3. Rate limit after authentication, per key. 429 is never VALID.
4. `/healthz` ≠ `/readyz`. Configuring Fabric without a Gateway makes the process **not ready**; it does not fake a ledger.

## Consequences

- A bank key can export reports it created of a university diploma, and cannot export the university’s other reports.
- Guessing report refs via the API is a 404 across tenants.
