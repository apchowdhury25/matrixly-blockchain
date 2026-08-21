/** Tenant-scoped RBAC. Public verification has no role. */

export const ROLES = ["TENANT_ADMIN", "ISSUER", "AUDITOR"] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = {
  issue: ["TENANT_ADMIN", "ISSUER"],
  ingest: ["TENANT_ADMIN", "ISSUER"],
  revoke: ["TENANT_ADMIN", "ISSUER"],
  rotateKeys: ["TENANT_ADMIN"],
  suspendIssuer: ["TENANT_ADMIN"],
  readAudit: ["TENANT_ADMIN", "ISSUER", "AUDITOR"],
  readKeys: ["TENANT_ADMIN", "ISSUER", "AUDITOR"],
  readDocuments: ["TENANT_ADMIN", "ISSUER", "AUDITOR"],
  manageApiKeys: ["TENANT_ADMIN"],
  manageWebhooks: ["TENANT_ADMIN"],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export function hasPermission(role: string, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly string[]).includes(role);
}

export function assertPermission(role: string, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    const allowed = PERMISSIONS[permission].join(" or ");
    throw new Error(`Not permitted: ${permission} requires ${allowed}`);
  }
}

export function permissionMap(role: string) {
  return {
    issue: hasPermission(role, "issue"),
    ingest: hasPermission(role, "ingest"),
    revoke: hasPermission(role, "revoke"),
    rotateKeys: hasPermission(role, "rotateKeys"),
    suspendIssuer: hasPermission(role, "suspendIssuer"),
    readAudit: hasPermission(role, "readAudit"),
    readKeys: hasPermission(role, "readKeys"),
    readDocuments: hasPermission(role, "readDocuments"),
    manageApiKeys: hasPermission(role, "manageApiKeys"),
    manageWebhooks: hasPermission(role, "manageWebhooks"),
  };
}
