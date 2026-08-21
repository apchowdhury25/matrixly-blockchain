# ADR-006 Verification reports and hash-chained audit

## Context

Verification wrote a `verification_requests` row. That is an application log, not evidence. Anyone who can write the database could assert that a diploma was verified.

## Decision

1. Every verification produces a **VerificationReport** signed by a platform verifier `did:key` (Ed25519 / `eddsa-jcs-2022`).
2. The report contains hashes, check flags, policy id, and result. **No holder name, email, or document bytes.**
3. The ledger stores a `VERIFICATION_ANCHOR` of the report hash only.
4. Tenant `audit_events` are themselves hash-chained (`prev_hash` / `event_hash`). A mutated event fails `verifyAuditSequence`.

## Consequences

- Home-page demo verifications also mint reports and anchors.
- Fabric still refuses `registerVerificationAnchor` until a Gateway exists.
