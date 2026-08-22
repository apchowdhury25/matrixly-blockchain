# QA results — 21 August 2026 (Phase 12)

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

## Gate

| Check | Status | Notes |
|---|---|---|
| `npm run test:trust` | PASS | 82 / 82 |
| `npm run typecheck` | PASS | |
| Public pages HTTP 200 | PASS | Home, OpenID4VCI, metadata well-known |
| Browser smoke | PASS | |

## Phase 12 — OpenID4VCI

| Step | Status | Notes |
|---|---|---|
| 12.1 Issuer metadata | PASS | `university_degree_ldp_vc` format `ldp_vc`; no `dc+sd-jwt` |
| 12.2 Preview wallet | PASS | ISSUED `urn:uuid:demo-valid-bcs`; not re-signed |
| 12.3 Replay | PASS | Second pull: pre-authorized_code already used |
| 12.4 Authorization code | PASS | `unsupported_grant_type` |
| 12.5 SD-JWT | PASS | `unsupported_credential_format` |
| 12.6 Regression | PASS | `demo-valid-bcs` still VALID; OpenID4VP page 200 |

## Verdict

| Item | Status |
|---|---|
| Phase 12 | PASS |
| HAIP / mdoc / authorization code not claimed | PASS |
