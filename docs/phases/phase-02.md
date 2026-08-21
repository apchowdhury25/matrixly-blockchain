# Phase 2 — Identity

Completed 21 August 2026.

## What was implemented

- Dedicated identity module: DID resolution, RBAC, key lifecycle
- `did:key` resolver used by the verification pipeline (fail closed)
- Tenant roles: `TENANT_ADMIN`, `ISSUER`, `AUDITOR` with server-enforced permissions
- Key rotation that issues a new `did:key`; old credentials still verify
- Public DID document page at `/did/$multibase`
- Ledger `DID` records (hash + public key only)
- Fabric chaincode `RegisterDID` / `GetDID` / `RegisterIssuer` / `GetIssuer`
- Schema `0003_identity.sql` for DID and key status
- Production wrapping-key requirement when `DATABASE_URL` is set

## Files created

- `src/lib/identity/did.ts`
- `src/lib/identity/roles.ts`
- `src/lib/identity/keys.ts`
- `src/lib/identity/identity.test.ts`
- `src/routes/did.$multibase.tsx`
- `migrations/0003_identity.sql`
- `docs/adr/ADR-002-identity.md`
- `docs/phases/phase-02.md`

## Files changed

- `src/lib/verification/pipeline.ts` — resolve via identity module
- `src/lib/ledger/adapter.ts`, `hash-chain.ts`, `fabric.ts` — DID port
- `src/lib/trust/functions.ts`, `seed.ts`, `seal.ts`
- `src/routes/app/keys.tsx`
- `chaincode/document-registry/document_registry.go`
- `README.md`, `docs/architecture/trust-model.md`

## Tests

`npm run test:trust` — crypto, credentials, ledger, identity.

Rotation test: a credential signed by DID₁ remains `VALID` after DID₂ becomes the current signer. A signature from DID₁ does not verify under DID₂'s public key.

## Not in this phase

- `did:web` / universal resolver
- Member invitations and org SSO provisioning
- Hardware security modules
- A live Hyperledger Fabric network
- Phase 3 (document ingestion / evidence packages)

Phase 3 starts only after explicit approval.
