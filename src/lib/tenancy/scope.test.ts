import assert from "node:assert/strict";
import { test } from "node:test";
import { assertTenantScope, canExportVerification, TenantScopeError } from "./scope";
import { assertPermission } from "../identity/roles";

test("same tenant is in scope; cross-tenant throws without leaking the resource", () => {
  assert.doesNotThrow(() => assertTenantScope("tenant_a", "tenant_a"));
  assert.throws(() => assertTenantScope("tenant_a", "tenant_b"), TenantScopeError);
  assert.throws(() => assertTenantScope(null, "tenant_a"), TenantScopeError);
  try {
    assertTenantScope("tenant_secret", "tenant_other");
  } catch (err) {
    assert.equal((err as Error).message.includes("tenant_secret"), false);
  }
});

test("export allowed for issuer tenant or the verifying API key only", () => {
  assert.equal(
    canExportVerification({
      resourceTenantId: "uni",
      apiKeyId: "key_bank",
      actorTenantId: "uni",
      actorApiKeyId: "key_uni",
    }),
    true,
  );
  assert.equal(
    canExportVerification({
      resourceTenantId: "uni",
      apiKeyId: "key_bank",
      actorTenantId: "bank",
      actorApiKeyId: "key_bank",
    }),
    true,
  );
  assert.equal(
    canExportVerification({
      resourceTenantId: "uni",
      apiKeyId: "key_bank",
      actorTenantId: "bank",
      actorApiKeyId: "key_other",
    }),
    false,
  );
});

test("AUDITOR cannot issue or revoke", () => {
  assert.throws(() => assertPermission("AUDITOR", "issue"), /Not permitted/);
  assert.throws(() => assertPermission("AUDITOR", "revoke"), /Not permitted/);
  assert.doesNotThrow(() => assertPermission("AUDITOR", "readAudit"));
  assert.doesNotThrow(() => assertPermission("ISSUER", "issue"));
  assert.throws(() => assertPermission("ISSUER", "manageApiKeys"), /Not permitted/);
});
