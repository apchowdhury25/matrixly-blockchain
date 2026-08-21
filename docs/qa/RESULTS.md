# QA results — 21 August 2026

Executor: Grok-Build (automated). Interactive issuer-console clicks that need a human session are noted.

## Gate

| Check | Result |
|---|---|
| `npm run test:trust` | **PASS** 56/56 |
| `npm run typecheck` | **PASS** |
| Preview home / trust / status / verify / wallet HTTP 200 | **PASS** |
| Browser smoke (desktop + mobile, no console errors) | **PASS** |

## Phase 1 — Foundation

| # | Result | Evidence |
|---|---|---|
| 1.1 Valid | **PASS** | `engine.test.ts` TEST A + home 200 |
| 1.2 Tampered | **PASS** | TEST A one-byte mutation |
| 1.3 Revoked | **PASS** | TEST D / D2 |
| 1.4 Expired | **PASS** | TEST E |
| 1.5 Opaque URL | **PASS** | refs are `demo-*-bcs`, no PII |
| 1.6 `/trust` | **PASS** | HTTP 200, cryptographic pipeline copy |

## Phase 2 — Identity

| # | Result | Evidence |
|---|---|---|
| 2.1–2.5 | **PASS** | `identity.test.ts` rotation + DID; Fabric refuse for DID |

Interactive rotate-button click not driven this run.

## Phase 3 — Documents

| # | Result | Evidence |
|---|---|---|
| 3.1–3.8 | **PASS** | `evidence.test.ts` + `ingest` magic-byte tests |

## Phase 4 — Holder

| # | Result | Evidence |
|---|---|---|
| 4.1 Wallet | **PASS** | `/wallet` 200 |
| 4.2–4.5 Claim/VP | **PASS** | `presentation.test.ts`; `/wallet` 200 |

## Phase 5 — Status

| # | Result | Evidence |
|---|---|---|
| 5.1–5.4 | **PASS** | `policy.test.ts`; `/status/demo` 200 |

## Phase 6 — Audit

| # | Result | Evidence |
|---|---|---|
| 6.1–6.4 | **PASS** | `report.test.ts`, `audit/chain.test.ts` |

## Phase 7 — Adapters

| # | Result | Evidence |
|---|---|---|
| 7.1 Preview playground still up | **PASS** | Home 200 + smoke |
| 7.2 Ledger names hash-chain | **PASS** | `getLedgerSummary` returns adapter + `integrityModel` |
| 7.3 Documents storage column | **PASS** | `listDocuments.storage_backend` |
| 7.4 Keys KMS name | **PASS** | `listKeys.kms` |
| 7.5 Fabric without Gateway throws | **PASS** | `fabric.test.ts` |
| 7.6 Mock Gateway hashes only | **PASS** | `fabric.test.ts` |
| 7.7 S3 without bucket throws | **PASS** | `storage.test.ts` |
| 7.8 Filesystem SHA-256 round-trip | **PASS** | `storage.test.ts` |
| 7.9 AWS KMS without key id throws | **PASS** | `kms.test.ts` |
| 7.10 Live Fabric peer | **BLOCKED** | No peer in this environment (correct) |

**Phase 7 verdict: PASS for shipped fail-closed adapters.** Live Fabric/S3/KMS remain operator work, not faked.
