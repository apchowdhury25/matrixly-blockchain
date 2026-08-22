# QA results — 21 August 2026 (Phase 17)

Catalog: [CASES.md](CASES.md). Procedures: [STEPS.md](STEPS.md). Last automated run: [LAST-RUN.md](LAST-RUN.md).

Executor: Grok-Build.

Score: **PASS** · **FAIL** · **BLOCKED**. A phase is not done if any required row is FAIL.

## Rollup

| Phase | Verdict | Tests | Notes |
|---|---|---|---|
| 1–16 | PASS | included | Prior phases |
| 17 Ledger export | PASS | included | Independent chainValid; tamper fails |

## Gate

| Check | Status | Notes |
|---|---|---|
| `npm run test:qa` | PASS | 75 / 75 |
| `npm run test:trust` | PASS | 119 / 119 |
| `npm run typecheck` | PASS | |
| Chain export | PASS | `matrixly.ledger.v1`, no holder PII |
| Tampered export | PASS | chainValid false |
| Demo verify | PASS | still VALID |

## Phase 17

| Step | Status | Notes |
|---|---|---|
| 17.1 Chain page | PASS | `/chain` 200 |
| 17.2 Machine export | PASS | format + chainValid |
| 17.3 Independent recompute | PASS | POST verify |
| 17.4 Tamper | PASS | payload hash mismatch |
| 17.6 Wrong Merkle root | PASS | chainValid false |

## Verdict

| Item | Status |
|---|---|
| Phase 17 | PASS |
| Export is not credential VALID | PASS | `diplomaEvaluated: false` + disclaimer |
| Fabric dump not faked | PASS |
