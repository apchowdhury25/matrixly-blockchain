# QA results — 21 August 2026 (Phase 20)

Catalog: [CASES.md](CASES.md). Procedures: [STEPS.md](STEPS.md). Last automated run: [LAST-RUN.md](LAST-RUN.md).

Executor: Grok-Build.

Score: **PASS** · **FAIL** · **BLOCKED**. A phase is not done if any required row is FAIL.

## Rollup

| Phase | Verdict | Tests | Notes |
|---|---|---|---|
| 1–19 | PASS | included | Prior phases |
| 20 Ledger receipt | PASS | included | Proof + STH; receiptValid ≠ VALID |

## Gate

| Check | Status | Notes |
|---|---|---|
| `npm run test:qa` | PASS | 91 / 91 |
| `npm run test:trust` | PASS | 132 / 132 |
| `npm run typecheck` | PASS | |
| Receipt | PASS | `matrixly.receipt.v1` |
| Cross-tree / tamper | PASS | not receiptValid |
| Demo verify | PASS | still VALID |

## Phase 20

| Step | Status | Notes |
|---|---|---|
| 20.1 Fetch receipt | PASS | diplomaEvaluated false |
| 20.2 Recompute | PASS | receiptValid + rootsMatch |
| 20.3 Tamper STH | PASS | not receiptValid |
| 20.4 Missing hash | PASS | 400 |
| 20.5 Regression | PASS | demo VALID |

## Verdict

| Item | Status |
|---|---|
| Phase 20 | PASS |
| receiptValid is not diploma VALID | PASS |
