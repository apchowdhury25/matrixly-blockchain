# QA results — 21 August 2026 (Phases 15–16)

Catalog: [CASES.md](CASES.md). Procedures: [STEPS.md](STEPS.md).

Executor: Grok-Build.

Score: **PASS** · **FAIL** · **BLOCKED**. A phase is not done if any required row is FAIL.

## Rollup

| Phase | Verdict | Tests | Notes |
|---|---|---|---|
| 1–14 | PASS | included | Prior phases |
| 15 Schema ledger | PASS | included | JCS hash on ledger; mismatch INVALID |
| 16 Team | PASS | included | Hashed invites; last-admin guard |

## Gate

| Check | Status | Notes |
|---|---|---|
| `npm run test:trust` | PASS | 110 / 110 |
| `npm run typecheck` | PASS | |
| Schema page | PASS | Anchored; `sha256:` shown; not a full 2020-12 processor |
| `GET /schemas/university-degree-credential.json` | PASS | `application/schema+json` + `x-schema-hash` |
| Demo verify | PASS | VALID; `checks.schemaAnchored` true |
| `/readyz` | PASS | `schemaAnchored: true` |
| `/app/team` | PASS | HTTP 200 (console; invite rules unit-tested) |
| Verify API 401 | PASS | UNAUTHORIZED, not VALID |
| Browser smoke | PASS | |

## Phase 15

| Step | Status | Notes |
|---|---|---|
| 15.1 Schema page | PASS | Anchored on the ledger |
| 15.2 Machine schema | PASS | Hash header matches |
| 15.3 Demo still verifies | PASS | VALID + schemaAnchored |
| 15.4 Wrong hash | PASS | Engine test never VALID |

## Phase 16

| Step | Status | Notes |
|---|---|---|
| 16.1 Team page | PASS | Route loads; copy-once copy in UI |
| 16.2 Invite hashed | PASS | Token ≠ hash unit test |
| 16.3 Last admin | PASS | Demote/deactivate throws |
| 16.4 AUDITOR cannot issue | PASS | RBAC |

## Verdict

| Item | Status |
|---|---|
| Phase 15 | PASS |
| Phase 16 | PASS |
| SOC 2 / SMTP / SCIM not claimed | PASS |
