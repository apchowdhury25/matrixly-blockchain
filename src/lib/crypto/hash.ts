import { createHash } from "node:crypto";

export const SHA256_ALG = "sha256" as const;

export type ContentHash = {
  algorithm: typeof SHA256_ALG;
  hex: string;
  prefixed: string;
  byteLength: number;
};

/** SHA-256 of canonical bytes. Never hashes a string encoding unless the caller already encoded it. */
export function sha256Bytes(bytes: Uint8Array): ContentHash {
  const hex = createHash("sha256").update(bytes).digest("hex");
  return {
    algorithm: SHA256_ALG,
    hex,
    prefixed: `${SHA256_ALG}:${hex}`,
    byteLength: bytes.byteLength,
  };
}

export function sha256Utf8(text: string): ContentHash {
  return sha256Bytes(new TextEncoder().encode(text));
}

export function parsePrefixedHash(value: string): { algorithm: string; hex: string } {
  const i = value.indexOf(":");
  if (i <= 0) throw new Error("Hash must be algorithm:hex");
  const algorithm = value.slice(0, i);
  const hex = value.slice(i + 1).toLowerCase();
  if (algorithm !== SHA256_ALG) throw new Error(`Unsupported hash algorithm: ${algorithm}`);
  if (!/^[0-9a-f]{64}$/.test(hex)) throw new Error("SHA-256 hex digest must be 64 chars");
  return { algorithm, hex };
}

export function hashesEqual(a: string, b: string): boolean {
  const left = parsePrefixedHash(a);
  const right = parsePrefixedHash(b);
  return left.algorithm === right.algorithm && left.hex === right.hex;
}

export function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.byteLength;
  }
  return out;
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0) throw new Error("Odd hex length");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
