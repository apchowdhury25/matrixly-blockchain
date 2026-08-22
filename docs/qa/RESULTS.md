# QA results — 21 August 2026 (Phase 11)

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
| 11 OpenID4VP | PASS | included | DCQL + `direct_post`; nonce-bound VP |

## Gate

| Check | Status | Notes |
|---|---|---|
| `npm run test:trust` | PASS | 76 / 76 |
| `npm run typecheck` | PASS | |
| Public pages HTTP 200 | PASS | Home, OpenID4VP, Compliance, Developers |
| Browser smoke | PASS | |

## Phase 11 — OpenID4VP

| Step | Status | Notes |
|---|---|---|
| 11.1 Create request | PASS | `response_type=vp_token`, `direct_post`, DCQL `ldp_vc`, nonce present |
| 11.2 Preview wallet | PASS | VALID, `nonceBound=true`, holder proof PASS. Not an EUDI wallet. |
| 11.3 Replay | PASS | Second submit: request no longer open; `verified: false` |
| 11.4 SD-JWT refused | PASS | JWT `eyJ…` vp_token → INVALID, never VALID |
| 11.5 Regression | PASS | `demo-valid-bcs` still VALID |

## Verdict

| Item | Status |
|---|---|
| Phase 11 | PASS |
| HAIP / OpenID4VCI / mdoc not claimed | PASS |
