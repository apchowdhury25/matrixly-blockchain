# ADR-014 SD-JWT is refused until a named requirement exists

## Context

Wallets and EUDI profiles ask for SD-JWT VC (`dc+sd-jwt`). Matrixly issues W3C VC 2.0 with Data Integrity.

## Decision

1. Do not implement SD-JWT issuance, presentation, or dual-write in this runtime.
2. Refuse `dc+sd-jwt`, `vc+sd-jwt`, and compact `eyJ…` tokens. Never return VALID for them.
3. Do not claim HAIP or eIDAS by documenting the specs.
4. If a regulator names SD-JWT as the issued format, add a **separate** adapter (new hash, new tests). Notes: [../architecture/sd-jwt.md](../architecture/sd-jwt.md).

## Consequences

- EUDI-only wallets cannot use Matrixly diplomas today (honest error).
- Selective disclosure is not available; the full W3C credential is signed.
