# QA results — 21 August 2026 (Phase 13)

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
| 12 OpenID4VCI | PASS | included | Pre-authorized `ldp_vc`; auth code refused |
| 13 Status + schema | PASS | included | Status list URL + published JsonSchema |

## Gate

| Check | Status | Notes |
|---|---|---|
| `npm run test:trust` | PASS | 95 / 95 |
| `npm run typecheck` | PASS | |
| Public pages HTTP 200 | PASS | Status JSON, schema JSON, schema page |
| Browser smoke | PASS | |

## Phase 13 — Status list URL and JsonSchema

| Step | Status | Notes |
|---|---|---|
| 13.1 Status JSON | PASS | `BitstringStatusListCredential` + proof at `/credentials/status/demo` |
| 13.2 Schema | PASS | `$id` `https://trust.matrixly.ai/schemas/university-degree-credential.json` |
| 13.3 Verify | PASS | `demo-valid-bcs` VALID via URL-resolved status list |
| 13.4 Regression | PASS | OpenID4VCI 200; typecheck/tests green |

## Verdict

| Item | Status |
|---|---|
| Phase 13 | PASS |
| Full JSON Schema 2020-12 processor not claimed | PASS |
