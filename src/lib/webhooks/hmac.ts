import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
import { sha256Utf8 } from "../crypto/hash";

export const WEBHOOK_SECRET_PREFIX = "mtx_whsec_";

export type SignedWebhook = {
  timestamp: string;
  payload: string;
  signature: string;
  header: string;
  payloadHash: string;
};

export function generateWebhookSecret(): { secret: string; prefix: string } {
  const secret = `${WEBHOOK_SECRET_PREFIX}${randomBytes(24).toString("base64url")}`;
  return { secret, prefix: secret.slice(0, 22) };
}

export function signWebhookPayload(secret: string, payload: string, timestamp = new Date().toISOString()): SignedWebhook {
  if (!secret.startsWith(WEBHOOK_SECRET_PREFIX) || secret.length < 24) {
    throw new Error("Webhook signing secret is missing. Refusing to send an unsigned event.");
  }
  const signature = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  return {
    timestamp,
    payload,
    signature,
    header: `t=${timestamp},v1=${signature}`,
    payloadHash: sha256Utf8(payload).prefixed,
  };
}

export function verifyWebhookSignature(secret: string, payload: string, header: string): boolean {
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const i = p.indexOf("=");
      return [p.slice(0, i), p.slice(i + 1)];
    }),
  );
  const timestamp = parts.t;
  const expected = parts.v1;
  if (!timestamp || !expected) return false;
  const actual = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  const a = Buffer.from(actual, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function assertWebhookUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Webhook URL is not valid");
  }
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "0.0.0.0" ||
    host === "169.254.169.254" ||
    host.endsWith(".internal") ||
    /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(host)
  ) {
    throw new Error("Webhook URL is not allowed (loopback, link-local, or private network)");
  }
  const testHost = host === "example.test" || host.endsWith(".example.test");
  if (url.protocol === "https:") return url.toString();
  if (url.protocol === "http:" && testHost) return url.toString();
  throw new Error("Webhook URL must be https");
}
