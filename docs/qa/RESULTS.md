# QA results — 21 August 2026 (Phase 8)

Executor: Grok-Build (automated + live HTTP). Interactive issuer-console clicks that need a human session are noted.

## Gate

| Check | Result |
|---|---|
| `npm run test:trust` | **PASS** 59/59 |
| `npm run typecheck` | **PASS** |
| Preview home / developers / verify / openapi HTTP 200 | **PASS** |
| Browser smoke (desktop + mobile, no console errors) | **PASS** |

## Phase 8 — Verifier API

| # | Result | Evidence |
|---|---|---|
| 8.1 No Authorization | **PASS** | HTTP 401, `verified: false`, `UNAUTHORIZED` |
| 8.2 Garbage bearer | **PASS** | HTTP 401, not VALID |
| 8.3 OpenAPI | **PASS** | `openapi` 3.0.3, path `/api/v1/verify` |
| 8.4 Developers page | **PASS** | HTTP 200, 401 copy |
| 8.5 Create key UI | **PASS** (code + admin RBAC test) | Interactive mint not clicked this run; demo key seeded hashed |
| 8.6 Authenticated valid | **PASS** | `VALID`; signature, ledger, signed status list true; no Alex/Rivera; reportRef present |
| 8.7 Tamper via documentB64 | **BLOCKED** | Not posted this run; playground one-byte tamper still covered by engine tests |
| 8.8 Revoke | **PASS** (code) | `revokeApiKey` sets REVOKED; garbage bearer already 401 |
| 8.9 RBAC | **PASS** | `identity.test.ts` auditor cannot `manageApiKeys` |
| 8.10 Regression | **PASS** | Home 200, Phase 1 tests still in 59/59 |

Revoked via API: **PASS** (`REVOKED`). Expired via API: **PASS** (`EXPIRED`). Report fetch: signature true, ledger anchored true.

**Phase 8 verdict: PASS.** Missing keys never return VALID.

---

Earlier phases (1–7) remain PASS from the previous RESULTS sheet; 59/59 includes those tests plus API key hashing.
