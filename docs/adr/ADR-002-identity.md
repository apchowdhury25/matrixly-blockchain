# ADR-002 Identity, DID method, and key rotation

## Context

Phase 1 shipped crypto primitives and a working issuer workspace that generated a single `did:key` at first sign-in. Verification decoded the public key from the identifier. There was no dedicated identity module, no RBAC beyond "signed in", and no key lifecycle.

## Decision

1. **DID method for this phase is `did:key` with Ed25519.** The public key is the identifier. Resolvers that cannot decode the key fail closed. `did:web` / `did:ion` remain future adapters, not this runtime.
2. **DID documents are public.** The ledger stores only the JCS SHA-256 of the document plus the multibase public key. Original documents and PII stay off-chain.
3. **Key rotation creates a new `did:key`.** That is cryptographically honest: the old identifier still verifies historical credentials; the new identifier signs new ones. The previous secret remains AES-256-GCM sealed and is marked `ROTATED` so it cannot issue.
4. **RBAC is tenant-scoped.** `TENANT_ADMIN` may rotate keys. `TENANT_ADMIN` and `ISSUER` may issue and revoke. `AUDITOR` is read-only. Public verification has no role.
5. **Production wrapping keys.** `BETTER_AUTH_SECRET` is required to wrap signing keys whenever `DATABASE_URL` is set. The preview-only fallback is not used against a networked database.

## Alternatives

- Keep a stable issuer DID and swap the key underneath. Rejected for `did:key`: the identifier *is* the key.
- Return rotated secrets to administrators. Rejected: APIs never return secret material.
- Fake Fabric DID writes. Rejected: `FabricLedgerAdapter.registerDid` throws unless a Gateway is configured.

## Consequences

- Verifiers resolve `did:key` independently of this database, then still require the issuer to be ACTIVE on the ledger.
- Issuers who rotate must distribute the new DID for newly issued credentials.
- Historical credentials remain verifiable without re-signing.
