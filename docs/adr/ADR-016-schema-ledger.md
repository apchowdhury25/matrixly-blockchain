# ADR-016 Schema bytes are hashed on the ledger

## Context

Phase 13 published a JsonSchema URL. A verifier that only checked `credentialSchema.id === known string` still trusted this application’s constant, not a ledger record.

## Decision

1. Hash the published schema with RFC 8785 JCS + SHA-256.
2. Register `{ schemaId, schemaHash }` as a `SCHEMA` ledger record.
3. If a credential includes `credentialSchema`, verification requires that ledger hash. A different hash is INVALID.
4. Do not fetch arbitrary schema URLs (SSRF). Unknown ids still fail closed.

## Consequences

- Changing the published schema without a new ledger record breaks verification (intentional).
- Legacy credentials without `credentialSchema` still verify (`schemaAnchored = null`).
