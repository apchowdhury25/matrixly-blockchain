# ADR-009 Webhooks and evidence packs

## Context

Machine verifiers (Phase 8) pull results. Banks also need push notification and an export they can archive. A webhook that is unsigned, or an export that includes the PDF / holder name, would fake security. A “compliant” badge would fake regulation.

## Decision

1. Sign every outbound event with HMAC-SHA256 over `timestamp.payload`. No secret → no send.
2. Store the signing secret sealed (same KMS wrap as issuer keys). Show once.
3. Allow only https (plus `*.example.test` for tests). Refuse loopback, RFC1918, and link-local/metadata hosts.
4. Webhook and evidence-pack JSON contain hashes, check flags, and the signed report — never original bytes or holder names.
5. The control matrix states **not-claimed** for certifications.

## Consequences

- Verifiers can independently check `matrixly-signature`.
- A down bank endpoint marks delivery FAILED; the credential result does not change.
- Operators cannot treat `/compliance` as an audit letter.
