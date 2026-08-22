# ADR-017 Hashed invites and last-admin guard

## Context

RBAC existed (TENANT_ADMIN / ISSUER / AUDITOR) but could not be assigned. First login auto-created a tenant, so an invited auditor would get their own issuer instead of joining.

## Decision

1. Only TENANT_ADMIN manages members.
2. Invite tokens are hashed at rest; plaintext shown once. No email transport in this runtime.
3. Claim pending invites by verified email **before** provisioning a new tenant.
4. Refuse demoting or deactivating the last TENANT_ADMIN.
5. Deactivated membership is not a cue to mint a new tenant.

## Consequences

- A user is in at most one active organization in this runtime.
- Invites without SMTP must be copied out of band.
