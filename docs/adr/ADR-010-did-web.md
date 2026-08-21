# ADR-010 did:web

## Context

ADR-002 chose `did:key` so verification does not depend on a network. Institutions still need a DID they publish at a domain they control.

## Decision

1. Keep `did:key` as the default signing identifier.
2. Publish a `did:web` document that lists the same Ed25519 Multikey and `alsoKnownAs` the `did:key`.
3. Resolve `did:web` over HTTPS. Private, loopback, and link-local hosts fail closed.
4. A DID document whose `id` does not match the identifier is rejected.
5. Unsupported methods remain errors, not VALID.

## Consequences

- A bank can verify `did:web:…` without trusting our issuer table for the public key (the key is in the document; the ledger still must list the issuer).
- Fetch failure is INVALID, never a skip.
- `did:web` is a CCG spec, not a W3C Recommendation — same honesty as the compliance matrix.
