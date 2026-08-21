# QA results — 21 August 2026 (Phase 10)

Executor: Grok-Build.

Score: **PASS** · **FAIL** · **BLOCKED**. A phase is not done if any required row is FAIL.

## Rollup

| Phase | Verdict | Tests | Notes |
|---|---|---|---|
| 1 Foundation | PASS | included | Original / tamper / revoked / expired |
| 2 Identity | PASS | included | `did:key`, RBAC, rotation |
| 3 Documents | PASS | included | Magic bytes, SHA-256 |
| 4 Holder | PASS | included | Wallet, claim, VP |
| 5 Status | PASS | included | Signed bitstring list |
| 6 Audit | PASS | included | Signed report, hash chain |
| 7 Adapters | PASS | included | Hash-chain preview; Fabric refuse |
| 8 Verifier API | PASS | included | 401 never VALID |
| 9 Webhooks / evidence | PASS | included | HMAC, evidence pack, matrix |
| 10 did:web | PASS | included | HTTPS DID documents; fail-closed fetch |

## Gate

| Check | Status | Notes |
|---|---|---|
| `npm run test:trust` | PASS | 71 / 71 |
| `npm run typecheck` | PASS | |
| Public pages HTTP 200 | PASS | Home, did:web, Compliance, Developers |
| Browser smoke | PASS | |

## Phase 10 — did:web

| Step | Status | Notes |
|---|---|---|
| 10.1 Public DID document | PASS | `id` is `did:web:matrixly.example.test:issuers:global-university`. Multikey. `alsoKnownAs` includes `did:key`. |
| 10.2 Playground did:web issuer | PASS | Home page 200 (button present). API path used for machine check. |
| 10.3 API `demo-valid-didweb` | PASS | VALID. `issuerDid` is did:web. All checks true. |
| 10.4 Fail closed | PASS | `did-web.test.ts`: private hosts, id mismatch, HTTP 404. |
| 10.5 Regression | PASS | `demo-valid-bcs` still VALID with `did:key`. |

## Verdict

| Item | Status |
|---|---|
| Phase 10 | PASS |
| Unknown DID methods never VALID | PASS |
| did:web is not claimed as a W3C Recommendation | PASS |
