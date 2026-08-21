# Phase 4 — Holder

Completed 21 August 2026.

## What was implemented

- Holder `did:key` wallet (sealed holder keys, independent of issuer tenants)
- Opaque claim delivery (`/wallet/claim/{token}`)
- W3C Verifiable Presentation 2.0 with holder `authentication` proof
- Public presentation verifier at `/present/{ref}`
- Optional `credentialSubject.id` binding at issuance
- Demo claim token `demo-claim-valid-bcs` for the valid Global University diploma
- Schema `0005_holder.sql`

## Tests

`src/lib/credentials/presentation.test.ts`:

- Unbound VC + holder VP → VALID
- Bound subject.id must match presenting holder
- Wrong holder key fails the presentation proof
- Tampered inner credential cannot be laundered through a valid VP

## QA

See [docs/qa.md](../qa.md).

## Not in this phase

- Mobile wallet / DIDComm
- Selective disclosure
- Phase 5 (status lists as credentials, verifier policies)
