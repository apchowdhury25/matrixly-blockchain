# ADR-004 Holder wallet and presentations

## Context

Phases 1–3 issued and verified credentials from the issuer side. There was no holder identity, no delivery, and no Verifiable Presentation. Possession was implied by knowing an opaque verify link.

## Decision

1. **Holders are `did:key` identities**, separate from issuer tenants. Signing secrets are AES-256-GCM sealed in `holder_keys`.
2. **Delivery is an opaque claim token**, not the credential JSON in email. Claiming copies the already-signed VC into the wallet. The signature is not rewritten.
3. **Presentations are W3C VP 2.0** signed by the holder with `proofPurpose: authentication`.
4. **Verification order is holder proof, then the existing credential pipeline.** A valid presentation of an invalid credential is invalid.
5. **If `credentialSubject.id` is set at issuance, it must match the presenting holder.** Unbound credentials can be presented by whoever claimed them (possession).

## Consequences

- Same signed-in user may hold both an issuer workspace and a holder wallet.
- Claim tokens are capabilities. Treat them like passwords.
- Selective disclosure and holder-bound SD-JWT are out of scope.
