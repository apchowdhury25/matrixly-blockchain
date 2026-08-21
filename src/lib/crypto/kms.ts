import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export type KeyWrappingAdapter = {
  readonly name: string;
  wrap(plainHex: string): string;
  unwrap(sealed: string): string;
};

function localWrappingKey(): Buffer {
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

export class LocalAesGcmKms implements KeyWrappingAdapter {
  readonly name = "LocalAesGcmKms";
  wrap(plainHex: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", localWrappingKey(), iv);
    const enc = Buffer.concat([cipher.update(plainHex, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, enc]).toString("base64");
  }
  unwrap(sealed: string): string {
    const buf = Buffer.from(sealed, "base64");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const enc = buf.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", localWrappingKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
  }
}

export class AwsKmsWrapping implements KeyWrappingAdapter {
  readonly name = "AwsKmsWrapping";
  constructor(private readonly keyId?: string) {}
  wrap(_plainHex: string): string {
    throw new Error(
      `AwsKmsWrapping is not connected${this.keyId ? ` (key ${this.keyId})` : ""}. ` +
        "Configure AWS KMS, then swap this adapter in. Refusing to wrap keys locally while claiming AWS KMS.",
    );
  }
  unwrap(_sealed: string): string {
    throw new Error(
      "AwsKmsWrapping is not connected. Refusing to unwrap with a local key while claiming AWS KMS.",
    );
  }
}

export function kmsBackend(): "local" | "aws" | "gcp" {
  const raw = (typeof process !== "undefined" ? process.env.KMS_BACKEND : undefined)?.trim().toLowerCase();
  if (raw === "aws" || raw === "gcp") return raw;
  return "local";
}

export function getKms(): KeyWrappingAdapter {
  const backend = kmsBackend();
  if (backend === "aws") {
    const keyId = typeof process !== "undefined" ? process.env.KMS_KEY_ID?.trim() : undefined;
    if (!keyId) {
      throw new Error("KMS_BACKEND=aws requires KMS_KEY_ID. Refusing to wrap keys locally while claiming AWS KMS.");
    }
    return new AwsKmsWrapping(keyId);
  }
  if (backend === "gcp") {
    throw new Error("KMS_BACKEND=gcp is not wired. Refusing to fake GCP KMS.");
  }
  return new LocalAesGcmKms();
}
