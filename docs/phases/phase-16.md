# Phase 16 — Team membership

**Status: implemented.** Completed 21 August 2026.

## What shipped

- TENANT_ADMIN invites by email. Token is shown once and stored as SHA-256 (`mtx_inv_…`).
- Roles: TENANT_ADMIN, ISSUER, AUDITOR (AUDITOR still cannot issue).
- Last TENANT_ADMIN cannot be demoted or deactivated.
- Pending invites are claimed on sign-in **before** auto-provisioning a new tenant.
- Deactivated members are not given a new organization.
- `/app/team` and `/invite/{token}`. No SMTP — the URL is the invite.
- ADR: [ADR-017](../adr/ADR-017-membership.md).

## What is not claimed

- Email delivery
- SCIM / IdP group sync
- SOC 2 access-review operating effectiveness

## Tests

`src/lib/identity/members.test.ts`
