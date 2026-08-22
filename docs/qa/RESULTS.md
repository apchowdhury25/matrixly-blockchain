# QA results — 21 August 2026 (Phase 18)

Catalog: [CASES.md](CASES.md). Procedures: [STEPS.md](STEPS.md). Last automated run: [LAST-RUN.md](LAST-RUN.md).

Executor: Grok-Build.

Score: **PASS** · **FAIL** · **BLOCKED**. A phase is not done if any required row is FAIL.

## Rollup

| Phase | Verdict | Tests | Notes |
|---|---|---|---|
| 1–17 | PASS | included | Prior phases |
| 18 Merkle proofs | PASS | included | RFC 6962 inclusion; included ≠ VALID |

## Gate

| Check | Status | Notes |
|---|---|---|
| `npm run test:qa` | PASS | 81 / 81 |
| `npm run test:trust` | PASS | 126 / 126 |
| `npm run typecheck` | PASS | |
| Inclusion proof | PASS | `matrixly.merkle-proof.v1` |
| Tampered path | PASS | not included |
| Demo verify | PASS | still VALID |

## Phase 18

| Step | Status | Notes |
|---|---|---|
| 18.1 Fetch proof | PASS | diplomaEvaluated false |
| 18.2 Recompute | PASS | included |
| 18.3 Tamper path | PASS | audit path mismatch |
| 18.4 Missing query | PASS | 400 |
| 18.5 Regression | PASS | demo VALID |

## Verdict

| Item | Status |
|---|---|
| Phase 18 | PASS |
| included is not diploma VALID | PASS |
