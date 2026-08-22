# Phase 14 — Tenant isolation, rate limits, readiness

**Status: implemented.** Completed 21 August 2026.

## What shipped

- Tenant-scoped verification **exports** (reports + evidence API). Cross-tenant is **404**, never VALID.
- Issuer tenant or the API key that ran the verification may export. Capability URLs (`/evidence/{ref}`) remain unguessable links.
- AUDITOR cannot issue or revoke (RBAC tests).
- Verifier API sliding-window rate limit. **429 `RATE_LIMITED`**, `verified: false`.
- `GET /healthz` liveness (process up — not a ledger proof).
- `GET /readyz` readiness (database + configured ledger). Fabric without Gateway → **not ready**.
- Public **Ops** page.

## What is not claimed

- DDoS / WAF / CDN protection
- Multi-region failover
- SOC 2 operational certification

## Tests

`src/lib/tenancy/scope.test.ts`, `src/lib/api/rate-limit.test.ts`
