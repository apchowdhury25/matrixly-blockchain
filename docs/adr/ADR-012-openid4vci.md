# ADR-012 OpenID4VCI 1.0 pre-authorized code

## Context

Phase 11 lets wallets *present*. Issuers also need a standard way for a wallet to *pull* a diploma. Our claim link is proprietary.

## Decision

1. Implement OpenID4VCI 1.0 **pre-authorized_code** only. The existing opaque claim token is the pre-authorized code.
2. Deliver the **already-signed** W3C VC. Claiming / pulling does not re-sign and does not rewrite `credentialSubject.id`.
3. Advertise `ldp_vc` only. SD-JWT and mdoc fail closed.
4. Do not implement authorization code flow, DPoP, or HAIP.

## Consequences

- A wallet that requires holder-binding proofs at issuance will not get a re-issued credential.
- A wallet that only speaks SD-JWT cannot pull from Matrixly (honest error).
- Matrixly wallet claim still works after VCI delivery (`DELIVERED` ≠ `CLAIMED`).
