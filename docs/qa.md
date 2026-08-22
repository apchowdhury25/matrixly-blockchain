# QA module

- **Click-by-click procedures:** [STEPS.md](STEPS.md)
- **Numbered test cases:** [CASES.md](CASES.md)
- **Automated runner:** `npm run test:qa` → [LAST-RUN.md](LAST-RUN.md)
- **Latest automated results:** [RESULTS.md](RESULTS.md)
- **API examples:** [api-examples.md](../api-examples.md)
- **Compliance matrix:** [compliance/matrix.md](../compliance/matrix.md)

Score each step **PASS** / **FAIL** / **BLOCKED**. A phase is not done if any required row is FAIL.

Public verification does not require an account. Issuer and holder steps do.

Independent failure rule: hash, signature, issuer, ledger, and status must be able to fail on their own. A green badge that skipped a failed check is a defect.

---

Quick index (full procedures in STEPS.md):

| Phase | Start | Core proof |
|---|---|---|
| 1 Foundation | Home playground | Original / tamper / revoked / expired |
| 2 Identity | Sign in → Keys | Public keys only; rotation keeps old VCs valid |
| 3 Documents | Documents | Magic bytes, SHA-256, dedup |
| 4 Holder | Wallet / demo claim | Claim copies VC; VP is holder-signed |
| 5 Status | Status + revoke | Signed bitstring list, not a DB flag |
| 6 Audit | Report link + Audit | Signed report, no PII; hash-chained events |
| 7 Adapters | Ledger page + `npm run test:trust` | Hash-chain in preview; Fabric/S3/KMS refuse if unconfigured |
| 8 Verifier API | Developers + API keys | 401 without key; VALID only with a live key |
| 9 Webhooks / evidence | Compliance + Webhooks + evidence pack | HMAC events; pack has no PII; matrix is not a certificate |
| 10 did:web | Keys + `/did-web/global-university` + playground | Hosted DID; fetch fail-closed; `demo-valid-didweb` is VALID |
| 11 OpenID4VP | `/oid4vp` + This preview wallet | VALID with nonce; replay INVALID; SD-JWT refused |
| 12 OpenID4VCI | `/oid4vci` + This preview wallet | ISSUED `ldp_vc`; replay refused; authorization_code refused |
| 13 Status + schema | `/credentials/status/demo` + `/schemas/university-degree` | JSON status list + schema; verify still VALID |
| 14 Tenancy + ops | `/ops` + `/healthz` + `/readyz` | Ready; 401 still not VALID; cross-tenant export 404 |
| 15 Schema ledger | Schema page + `x-schema-hash` | Anchored; demo VALID with `schemaAnchored` |
| 16 Team | `/app/team` | Invite token shown once; last admin cannot be removed |
| 17 Ledger export | `/chain` + `GET /api/v1/ledger/chain` | Independent `chainValid`; tamper not VALID |
| 18 Merkle proofs | `/chain` + `GET /api/v1/ledger/proof` | `included` with `diplomaEvaluated: false` |
| Legal | `/legal` | Results are not a legal determination |

Always re-run `npm run test:qa` and the [minimum ship set](CASES.md#minimum-ship-set-every-phase) after a change.

## Out of scope

- `did:web` / universal resolver
- Mobile wallet / DIDComm / selective disclosure
- Operating a production Fabric consortium from this app
