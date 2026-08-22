# QA test cases

Catalog for the live preview. Score **PASS** / **FAIL** / **BLOCKED**.

A case is FAIL if a cryptographic check is skipped or if the product returns **VALID** when it must not. Independent checks (hash, signature, issuer, ledger, status, schema) must each be able to fail.

How to use:

1. **Automated:** `npm run test:qa` (live preview + in-process policy checks). Writes [LAST-RUN.md](LAST-RUN.md).
2. Run public cases first in the browser if you want to see the cards.
3. Sign in for issuer / team / wallet cases the runner cannot click.
4. Record human results in [RESULTS.md](RESULTS.md). Click-by-click: [STEPS.md](STEPS.md).

Demo verifier key (preview only): `mtx_live_demo_verifier_qa_only`. Demo diploma ref: `demo-valid-bcs`.

---

## Score key

| Result | When to use |
|---|---|
| PASS | Expected status and flags match; no extra VALID |
| FAIL | VALID when it must not be, or a required flag is missing |
| BLOCKED | Environment prevented the step (auth, network) — not a product pass |

---

## Phase 1 — Foundation

| ID | Title | Steps | Expected |
|---|---|---|---|
| TC-1.1 | Original PDF | Home → **Original PDF** | `VALID`; issuer, signature, SHA-256, ledger, signed status list all PASS |
| TC-1.2 | One-byte tamper | Home → **One-byte tamper** | `INVALID`; Document SHA-256 FAIL; must not be VALID |
| TC-1.3 | Revoked | Home → **Revoked** | `REVOKED`; credential status FAIL |
| TC-1.4 | Expired | Home → **Expired** | `EXPIRED`; not VALID |
| TC-1.5 | Opaque link | Copy verifier URL from Original PDF | Path is `/verify/demo-valid-bcs`; no holder name or email in the URL |
| TC-1.6 | Trust model | Open **Trust model** | Says verifier decides from crypto + ledger, not an application row |

## Phase 2 — Identity

| ID | Title | Steps | Expected |
|---|---|---|---|
| TC-2.1 | Public keys only | Sign in → **Keys** | `did:key`, publicKeyMultibase, no hex secret |
| TC-2.2 | DID document | Open public DID link | JSON `@context`, `id`, Ed25519 method; no private key |
| TC-2.3 | Rotation | Keys → rotate | New current signer; previously issued VC still verifies |

## Phase 3 — Documents

| ID | Title | Steps | Expected |
|---|---|---|---|
| TC-3.1 | PDF ingest | Documents → upload a real PDF | SHA-256 shown; magic bytes PDF |
| TC-3.2 | MZ rejected | Rename `.exe` to `.pdf` and upload | Rejected; not stored as a diploma |
| TC-3.3 | Dedup | Upload the same PDF twice | Same hash; not a second evidence object |

## Phase 4 — Holder

| ID | Title | Steps | Expected |
|---|---|---|---|
| TC-4.1 | Demo claim | `/wallet/claim/demo-claim-valid-bcs` | Wallet holds a copy of the VC; issuer proof unchanged |
| TC-4.2 | Present | Wallet → present | Holder-signed VP; inner VC still issuer-signed |
| TC-4.3 | Claim is not issuance | Inspect claimed VC `proof` | Same issuer verification method as before claim |

## Phase 5 — Status

| ID | Title | Steps | Expected |
|---|---|---|---|
| TC-5.1 | Signed list | Status page | Bitstring status list is a signed VC, not a DB flag |
| TC-5.2 | Revoke then verify | Issue → revoke → public verifier | `REVOKED`, not VALID |

## Phase 6 — Audit

| ID | Title | Steps | Expected |
|---|---|---|---|
| TC-6.1 | Signed report | Original PDF → signed report link | Report JSON has Data Integrity proof; no holder PII |
| TC-6.2 | Audit chain | Sign in → **Audit** | Events have `prev_hash`; tampering a row would break the chain |

## Phase 7 — Adapters

| ID | Title | Steps | Expected |
|---|---|---|---|
| TC-7.1 | Preview ledger | **Ledger** / **Ops** | Adapter is hash-chain in this preview |
| TC-7.2 | Fabric refuse | Automated `npm run test:trust` | Unconfigured Fabric never successfully submits |
| TC-7.3 | Bytes off-chain | Ledger payload | No PDF bytes in ledger records |

## Phase 8 — Verifier API

| ID | Title | Steps | Expected |
|---|---|---|---|
| TC-8.1 | Missing key | `POST /api/v1/verify` without Authorization | `401`, `status: UNAUTHORIZED`, `verified: false` |
| TC-8.2 | Demo VALID | Bearer demo key, `{"ref":"demo-valid-bcs"}` | `VALID`, `verified: true` |
| TC-8.3 | Tamper via API | Bound verify with mutated bytes | not VALID; documentSha256 false |
| TC-8.4 | OpenAPI | `GET /api/v1/openapi.json` | Lists `/api/v1/verify` |

### TC-8.1 command

```bash
curl -s -X POST http://127.0.0.1:8080/api/v1/verify \
  -H 'content-type: application/json' \
  -d '{"ref":"demo-valid-bcs"}'
```

Expected body includes `"verified":false` and `"status":"UNAUTHORIZED"`. Never `"VALID"`.

### TC-8.2 command

```bash
curl -s -X POST http://127.0.0.1:8080/api/v1/verify \
  -H 'content-type: application/json' \
  -H 'authorization: Bearer mtx_live_demo_verifier_qa_only' \
  -d '{"ref":"demo-valid-bcs"}'
```

Expected: `"status":"VALID"` and `"checks":{"schemaAnchored":true,...}`.

## Phase 9 — Webhooks and evidence

| ID | Title | Steps | Expected |
|---|---|---|---|
| TC-9.1 | HMAC required | Webhook delivery row | `matrixly-signature` present; unsigned payload refused in tests |
| TC-9.2 | Evidence pack | Open evidence for a report ref | No holder name; hashes + signed report |
| TC-9.3 | Compliance matrix | **Compliance** | REG-01 is `not-claimed`; page is not a certificate |

## Phase 10 — did:web

| ID | Title | Steps | Expected |
|---|---|---|---|
| TC-10.1 | Hosted document | `/did-web/global-university` | DID document JSON; Ed25519 method |
| TC-10.2 | SSRF | Resolve `did:web` on loopback / RFC1918 | Fail closed; never VALID |
| TC-10.3 | did:web demo | Playground / ref `demo-valid-didweb` if present | VALID with hosted issuer |

## Phase 11 — OpenID4VP

| ID | Title | Steps | Expected |
|---|---|---|---|
| TC-11.1 | Create request | `/oid4vp` → create | DCQL `ldp_vc`; QR / request URI |
| TC-11.2 | Preview wallet | **This preview wallet** | `VALID`; nonce bound in Data Integrity `challenge` |
| TC-11.3 | Replay | Submit the same request twice | Second is not VALID |
| TC-11.4 | SD-JWT refused | DCQL format `dc+sd-jwt` | not VALID |

## Phase 12 — OpenID4VCI

| ID | Title | Steps | Expected |
|---|---|---|---|
| TC-12.1 | Metadata | `GET /.well-known/openid-credential-issuer` | `format` is `ldp_vc`; no `dc+sd-jwt` config |
| TC-12.2 | Preview pull | `/oid4vci` → **This preview wallet** | `ISSUED`; existing signed VC, not re-signed |
| TC-12.3 | Replay code | Pull twice | Second fails; not a second ISSUED |
| TC-12.4 | Auth code refused | Token `grant_type=authorization_code` | `unsupported_grant_type` |
| TC-12.5 | SD-JWT refused | Credential `format=dc+sd-jwt` | `unsupported_credential_format` |

## Phase 13 — Status URL and JsonSchema

| ID | Title | Steps | Expected |
|---|---|---|---|
| TC-13.1 | Status JSON | `GET /credentials/status/demo` | `BitstringStatusListCredential` + proof |
| TC-13.2 | Schema page | `/schemas/university-degree` | Published `$id`; not a full 2020-12 processor |
| TC-13.3 | Loopback status URL | Status list URL `http://127.0.0.1/...` | Fail closed |
| TC-13.4 | Unknown schema id | Credential with `credentialSchema.id` on another host | INVALID |

## Phase 14 — Tenancy and ops

| ID | Title | Steps | Expected |
|---|---|---|---|
| TC-14.1 | Ops | `/ops` | Ready Yes; ledger named hash-chain; not “Fabric submitted” |
| TC-14.2 | Liveness | `GET /healthz` | `{ "status": "ok" }` — no ledger proof |
| TC-14.3 | Readiness | `GET /readyz` | `ready: true`, `db`, `ledger` |
| TC-14.4 | Cross-tenant export | Foreign tenant + foreign API key on a report | 404; never VALID |
| TC-14.5 | Rate limit | Exceed per-key window on `/api/v1/verify` | `429`, `RATE_LIMITED`, `verified: false` |
| TC-14.6 | AUDITOR cannot issue | Role check | `hasPermission("AUDITOR","issue")` is false |

## Phase 15 — Schema ledger

| ID | Title | Steps | Expected |
|---|---|---|---|
| TC-15.1 | Schema hash on page | `/schemas/university-degree` | `sha256:` + **Anchored on the ledger** |
| TC-15.2 | Hash header | `GET /schemas/university-degree-credential.json` | `content-type: application/schema+json`; `x-schema-hash` matches the page |
| TC-15.3 | Demo schemaAnchored | TC-8.2 | `checks.schemaAnchored === true` and status VALID |
| TC-15.4 | Wrong ledger hash | Register SCHEMA with a different hash (unit test) | INVALID; `schemaAnchored` false |
| TC-15.5 | Readyz schema | `GET /readyz` | `schemaAnchored: true` in this preview |
| TC-15.6 | Tamper still independent | Home → One-byte tamper | Still INVALID on SHA-256 even if schema is anchored |

### TC-15.2 command

```bash
curl -sI http://127.0.0.1:8080/schemas/university-degree-credential.json
```

Expect `x-schema-hash: sha256:` + 64 hex and `content-type: application/schema+json`.

## Phase 16 — Team

| ID | Title | Steps | Expected |
|---|---|---|---|
| TC-16.1 | Team page | Sign in → **Team** | Explains tokens are shown once; no SMTP |
| TC-16.2 | Create invite | Email + role ISSUER → Create invite | URL `/invite/mtx_inv_…` shown once |
| TC-16.3 | Token not stored in plaintext | Reload Team | PENDING row; full token gone |
| TC-16.4 | Last admin | Demote the only TENANT_ADMIN | Error; role unchanged |
| TC-16.5 | AUDITOR cannot issue | Invite AUDITOR (or unit test) | `issue` permission false |
| TC-16.6 | Bad invite URL | Open `/invite/mtx_inv_notarealtoken` | Invite is invalid; not a 500 crash |
| TC-16.7 | ISSUER cannot manage members | Sign in as ISSUER if available | Team manage APIs refuse |

## Negative / honesty cases (must never look certified)

| ID | Title | Steps | Expected |
|---|---|---|---|
| TC-N.1 | SOC 2 | `/soc2` and **Compliance** | “not claimed”; REG-01 `not-claimed` |
| TC-N.2 | SD-JWT | `/sd-jwt` | `dc+sd-jwt` refused; no dual-write |
| TC-N.3 | HAIP | Developers / OpenID pages | Explicitly not HAIP certified |
| TC-N.4 | Fabric | Ops / Ledger | Hash-chain in preview; no fake Fabric tx |

## Phase 17 — Independent ledger

| ID | Title | Steps | Expected |
|---|---|---|---|
| TC-17.1 | Chain export | `GET /api/v1/ledger/chain` | `matrixly.ledger.v1`, `chainValid` true, `merkleRoot`, no credential VALID, no holder PII |
| TC-17.2 | Recompute | POST export to `/api/v1/ledger/verify` | `chainValid` true; not `verified: true` |
| TC-17.3 | Tampered export | Mutate a payload field, POST again | `chainValid` false |
| TC-17.4 | Chain page | `/chain` | Intact copy; not a diploma VALID |
| TC-17.5 | Regression | TC-8.2 | Demo still VALID |
| TC-17.6 | Wrong Merkle root | Flip `merkleRoot`, POST verify | `chainValid` false |

---

## Automated gate

```bash
npm run test:trust
npm run typecheck
```

**PASS if** all tests pass and typecheck is clean. This does **not** replace TC-1.1–TC-1.4 in the browser.

---

## Minimum ship set (every phase)

Always re-run after a change:

1. TC-1.1 Original VALID
2. TC-1.2 Tamper INVALID
3. TC-8.1 401 not VALID
4. TC-8.2 Demo VALID + schemaAnchored
5. TC-N.1 SOC 2 not claimed
