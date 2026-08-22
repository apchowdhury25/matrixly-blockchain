# Phase 15 — Ledger-anchored JsonSchema

**Status: implemented.** Completed 21 August 2026.

## What shipped

- Published UniversityDegree JsonSchema is hashed with RFC 8785 JCS + SHA-256.
- That hash is registered on the ledger (`SCHEMA` records).
- Verifier `schemaAnchored` must be true when `credentialSchema` is present. Wrong hash → INVALID.
- `GET /schemas/university-degree-credential.json` includes `x-schema-hash`.
- Fabric `RegisterSchema` still requires a real Gateway.
- ADR: [ADR-016](../adr/ADR-016-schema-ledger.md).

## What is not claimed

- A full JSON Schema 2020-12 processor
- Schema as a substitute for the credential signature

## Tests

`src/lib/schema/university-degree.test.ts`, `src/lib/credentials/engine.test.ts` (schema hash mismatch)
