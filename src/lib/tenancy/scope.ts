/** Tenant isolation. Public verify stays public. Exports and issuer reads are scoped. */

export class TenantScopeError extends Error {
  readonly code = "TENANT_SCOPE";
  constructor(message = "Not found") {
    super(message);
    this.name = "TenantScopeError";
  }
}

export function assertTenantScope(resourceTenantId: string | null | undefined, actorTenantId: string): void {
  if (!actorTenantId) throw new TenantScopeError();
  if (!resourceTenantId || resourceTenantId !== actorTenantId) throw new TenantScopeError();
}

/** Issuer tenant or the API key that created the report may export it. */
export function canExportVerification(input: {
  resourceTenantId: string | null | undefined;
  apiKeyId: string | null | undefined;
  actorTenantId: string;
  actorApiKeyId: string;
}): boolean {
  if (input.resourceTenantId && input.resourceTenantId === input.actorTenantId) return true;
  if (input.apiKeyId && input.apiKeyId === input.actorApiKeyId) return true;
  return false;
}
