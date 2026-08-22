# QA results — 21 August 2026 (Phase 19)

Catalog: [CASES.md](CASES.md). Procedures: [STEPS.md](STEPS.md). Last automated run: [LAST-RUN.md](LAST-RUN.md).

Executor: Grok-Build.

Score: **PASS** · **FAIL** · **BLOCKED**. A phase is not done if any required row is FAIL.

## Rollup

| Phase | Verdict | Tests | Notes |
|---|---|---|---|
| 1–18 | PASS | included | Prior phases |
| 19 Signed tree head | PASS | included | Ed25519 STH; not CT; not diploma VALID |

## Gate

| Check | Status | Notes |
|---|---|---|
| `npm run test:qa` | PASS | 86 / 86 |
| `npm run test:trust` | PASS | 129 / 129 |
| `npm run typecheck` | PASS | |
| STH signature | PASS | `matrixly.sth.v1` |
| Tampered root | PASS | signature invalid |
| Demo verify | PASS | still VALID |

## Phase 19

| Step | Status | Notes |
|---|---|---|
| 19.1 Fetch STH | PASS | SignedTreeHead, diplomaEvaluated false |
| 19.2 Recompute | PASS | signatureValid |
| 19.3 Tamper root | PASS | Ed25519 mismatch |
| 19.4 Not CT | PASS | Chain page |
| 19.5 Regression | PASS | demo VALID |

## Verdict

| Item | Status |
|---|---|
| Phase 19 | PASS |
| Not Certificate Transparency | PASS |
| STH is not diploma VALID | PASS |
