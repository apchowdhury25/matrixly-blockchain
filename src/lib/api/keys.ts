import { randomBytes, timingSafeEqual } from "node:crypto";
import { sha256Utf8 } from "../crypto/hash";

export const API_KEY_PREFIX = "mtx_live_";

export type GeneratedApiKey = {
  secret: string;
  prefix: string;
  secretHash: string;
};

export function generateApiKey(): GeneratedApiKey {
  const secret = `${API_KEY_PREFIX}${randomBytes(24).toString("base64url")}`;
  return { secret, prefix: secret.slice(0, 20), secretHash: hashApiKey(secret) };
}

export function hashApiKey(secret: string): string {
  return sha256Utf8(secret).hex;
}

export function parseBearer(header: string | null | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(\S+)/i.exec(header.trim());
  const token = match?.[1]?.trim();
  if (!token || !token.startsWith(API_KEY_PREFIX) || token.length < 20) return null;
  return token;
}

export function hashesMatch(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
