import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function wrappingKey(): Buffer {
  const secret = typeof process !== "undefined" ? process.env.BETTER_AUTH_SECRET?.trim() : undefined;
  if (!secret) {
    const databaseUrl = typeof process !== "undefined" ? process.env.DATABASE_URL?.trim() : undefined;
    if (databaseUrl) {
      throw new Error(
        "BETTER_AUTH_SECRET is required to wrap signing keys when DATABASE_URL is set. Refusing the preview fallback.",
      );
    }
  }
  const material = secret || "matrixly-trust-dev-wrapping-key";
  return createHash("sha256").update(`matrixly-kms:${material}`).digest();
}

/** AES-256-GCM seal. Stored value is ciphertext, never a raw secret key. */
export function sealSecret(plainHex: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", wrappingKey(), iv);
  const enc = Buffer.concat([cipher.update(plainHex, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function openSecret(sealed: string): string {
  const buf = Buffer.from(sealed, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", wrappingKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}
