# Phase 5 — Status and verifier policy

Completed 21 August 2026.

## What was implemented

- W3C BitstringStatusListCredential issuance and re-signing on revoke
- Default verifier policy `matrixly.default.v1` (signed status list required)
- Public status list document at `/status/{id}`
- Issuer Status page
- Schema `0006_status.sql`
- Tests: bit revokes independently of the DB row; unsigned bitstring is INVALID; tampered list fails; allow-list; allowExpired

## Not in this phase

- Multi-purpose status lists (suspension vs revocation)
- External HTTP status-list crawler (this runtime resolves from the issuer store)
- Phase 6 (audit completeness / verification reports as signed artifacts)
