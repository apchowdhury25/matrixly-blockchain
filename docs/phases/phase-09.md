# Phase 9 — Webhooks, evidence packs, compliance matrix

**Status: implemented.** Completed 21 August 2026.

Phase 8 gave banks a pull API. Phase 9 adds push events, an exportable evidence pack, and an honest control matrix.

## What shipped

- HMAC-SHA256 webhooks (`mtx_whsec_…`, sealed at rest, shown once)
- Header `matrixly-signature: t=<iso>,v1=<hex>`
- Payload: hashes and flags only — no holder name, no PDF
- HTTPS-only URLs (http allowed solely for `*.example.test`); loopback / link-local / metadata IPs refused
- Unsigned events refused
- Delivery log (DELIVERED / FAILED). Failed HTTP does not rewrite verification
- Evidence pack (`MatrixlyEvidencePack`) at `/evidence/{ref}` and `GET /api/v1/evidence/{ref}`
- Public **Compliance** matrix — engineering controls, **not** SOC 2 / ISO / eIDAS / GDPR certification

## Tests

`hmac.test.ts`, `deliver.test.ts`, `pack.test.ts`, `matrix.test.ts`, RBAC `manageWebhooks`.
