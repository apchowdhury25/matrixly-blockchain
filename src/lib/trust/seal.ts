import { getKms } from "@/lib/crypto/kms";

/** AES-256-GCM seal via the configured KMS adapter. Never stores a raw secret key. */
export function sealSecret(plainHex: string): string {
  return getKms().wrap(plainHex);
}

export function openSecret(sealed: string): string {
  return getKms().unwrap(sealed);
}
