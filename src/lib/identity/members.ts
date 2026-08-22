/** Tenant membership rules. Invites are hashed; the last TENANT_ADMIN cannot be removed. */

import { randomBytes } from "node:crypto";
import { sha256Utf8 } from "../crypto/hash";
import { isRole, type Role } from "./roles";

export const INVITE_PREFIX = "mtx_inv_";
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function generateInviteToken(): { token: string; tokenHash: string; prefix: string } {
  const token = `${INVITE_PREFIX}${randomBytes(24).toString("base64url")}`;
  return { token, tokenHash: hashInviteToken(token), prefix: token.slice(0, 16) };
}

export function hashInviteToken(token: string): string {
  return sha256Utf8(token).hex;
}

export function inviteExpiresAt(now = Date.now()): string {
  return new Date(now + INVITE_TTL_MS).toISOString();
}

export function assertAssignableRole(role: string): asserts role is Role {
  if (!isRole(role)) throw new Error(`Role ${role} is not assignable`);
}

export function assertLastAdminGuard(input: {
  targetCurrentRole: string;
  next: "INACTIVE" | Role;
  activeAdminCount: number;
}): void {
  const remainingAdmin = input.next === "TENANT_ADMIN";
  if (input.targetCurrentRole === "TENANT_ADMIN" && !remainingAdmin && input.activeAdminCount <= 1) {
    throw new Error("The last TENANT_ADMIN cannot be demoted or deactivated");
  }
}

export function assertInviteFresh(expiresAt: string, now = new Date()): void {
  if (new Date(expiresAt).getTime() <= now.getTime()) {
    throw new Error("Invite has expired");
  }
}
