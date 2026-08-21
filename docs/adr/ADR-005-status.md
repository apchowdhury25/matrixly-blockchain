# ADR-005 Signed status lists and verifier policy

## Context

Revocation used a gzip bitstring in the application database. Verifiers decoded that string. A centralized `credentials.status = REVOKED` row could also short-circuit. That is not a W3C Bitstring Status List credential.

## Decision

1. Each issuer publishes a **BitstringStatusListCredential** signed with the same Ed25519 key as diplomas.
2. Revocation sets a bit **and re-signs** the status list credential.
3. The default verifier policy **requires** that signed credential. A raw `encodedList` is not evidence.
4. A set bit revokes even if the credentials table still says ACTIVE.
5. Policies are explicit (`matrixly.default.v1`): signed status list, issuer on ledger, ledger anchor, unrevoked, not expired. Allow-lists and `allowExpired` are first-class overrides.

## Consequences

- Historical verify of expired credentials needs `allowExpired: true`.
- Verifiers that cannot obtain the current signed list must fail closed.
