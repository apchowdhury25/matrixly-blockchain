# QA results — 21 August 2026 (Phase 9)

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

## Gate

| Check | Status | Notes |
|---|---|---|
| `npm run test:trust` | PASS | 67 / 67 |
| `npm run typecheck` | PASS | |
| Public pages HTTP 200 | PASS | Home, Compliance, Developers, Trust |
| Browser smoke | PASS | |

## Phase 9 — Webhooks, evidence, compliance

| Step | Status | Notes |
|---|---|---|
| 9.1 Compliance is not a certificate | PASS | Page 200. `REG-01` not-claimed. `DLT-02` fail-closed. |
| 9.2 Evidence pack UI | PASS | `/evidence/{ref}` 200 after valid verify. |
| 9.3 Evidence API | PASS | No key → 401. Demo key → `MatrixlyEvidencePack`, signature true, no holder name. |
| 9.4 Create webhook | PASS | HMAC URL tests. Interactive mint not clicked this run. |
| 9.5 Delivery after verify | PASS | Dispatch on persist. Failed HTTP does not rewrite VALID. |
| 9.6 HMAC / SSRF | PASS | Tamper fails. `https://169.254.169.254` refused. |
| 9.7 Regression | PASS | Valid API still VALID. Suite covers phases 1–8. |

## Verdict

| Item | Status |
|---|---|
| Phase 9 | PASS |
| Unsigned events refused | PASS |
| Compliance page does not claim certification | PASS |
