import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assertAssignableRole,
  assertInviteFresh,
  assertLastAdminGuard,
  generateInviteToken,
  hashInviteToken,
  INVITE_PREFIX,
  normalizeEmail,
} from "./members";
import { hasPermission } from "./roles";

test("invite tokens are prefixed and stored as hashes", () => {
  const generated = generateInviteToken();
  assert.equal(generated.token.startsWith(INVITE_PREFIX), true);
  assert.equal(generated.tokenHash, hashInviteToken(generated.token));
  assert.notEqual(generated.tokenHash, generated.token);
});

test("emails are normalized; unknown roles are refused", () => {
  assert.equal(normalizeEmail("  Registrar@University.EDU "), "registrar@university.edu");
  assert.doesNotThrow(() => assertAssignableRole("AUDITOR"));
  assert.throws(() => assertAssignableRole("SUPERUSER"), /not assignable/);
});

test("the last TENANT_ADMIN cannot be demoted or deactivated", () => {
  assert.throws(
    () => assertLastAdminGuard({ targetCurrentRole: "TENANT_ADMIN", next: "ISSUER", activeAdminCount: 1 }),
    /last TENANT_ADMIN/,
  );
  assert.throws(
    () => assertLastAdminGuard({ targetCurrentRole: "TENANT_ADMIN", next: "INACTIVE", activeAdminCount: 1 }),
    /last TENANT_ADMIN/,
  );
  assert.doesNotThrow(() =>
    assertLastAdminGuard({ targetCurrentRole: "TENANT_ADMIN", next: "ISSUER", activeAdminCount: 2 }),
  );
  assert.doesNotThrow(() =>
    assertLastAdminGuard({ targetCurrentRole: "ISSUER", next: "INACTIVE", activeAdminCount: 1 }),
  );
});

test("expired invites are refused; ISSUER cannot manage members", () => {
  assert.throws(() => assertInviteFresh("2000-01-01T00:00:00.000Z"), /expired/);
  assert.doesNotThrow(() => assertInviteFresh(new Date(Date.now() + 60_000).toISOString()));
  assert.equal(hasPermission("ISSUER", "manageMembers"), false);
  assert.equal(hasPermission("AUDITOR", "manageMembers"), false);
  assert.equal(hasPermission("TENANT_ADMIN", "manageMembers"), true);
});
