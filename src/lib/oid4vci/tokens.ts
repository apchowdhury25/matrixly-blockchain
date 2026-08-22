import { randomBytes, timingSafeEqual } from "node:crypto";
import { sha256Utf8 } from "../crypto/hash";
import { VCI_TOKEN_PREFIX } from "./constants";

export function generateAccessToken(): { secret: string; prefix: string; hash: string } {
  const secret = `${VCI_TOKEN_PREFIX}${randomBytes(24).toString("base64url")}`;
  return { secret, prefix: secret.slice(0, 16), hash: hashVciToken(secret) };
}

export function hashVciToken(secret: string): string {
  return sha256Utf8(secret).hex;
}

export function parseVciBearer(header: string | null | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(\S+)/i.exec(header.trim());
  const token = match?.[1]?.trim();
  if (!token || !token.startsWith(VCI_TOKEN_PREFIX) || token.length < 20) return null;
  return token;
}

export function hashesMatch(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
