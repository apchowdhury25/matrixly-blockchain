# QA module

- **Click-by-click procedures:** [STEPS.md](STEPS.md)
- **Latest automated results:** [RESULTS.md](RESULTS.md)
- **API examples:** [api-examples.md](../api-examples.md)

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

## Out of scope

- `did:web` / universal resolver
- Mobile wallet / DIDComm / selective disclosure
- Operating a production Fabric consortium from this app
