import { gunzipSync, gzipSync } from "node:zlib";
import { base64urlnopad } from "@scure/base";

/** Bitstring Status List 1.0 minimum encoded size is 16KB uncompressed (131072 bits). */
export const STATUS_LIST_BIT_SIZE = 16 * 1024 * 8;

export function emptyStatusList(): Uint8Array {
  return new Uint8Array(STATUS_LIST_BIT_SIZE / 8);
}

export function setBit(list: Uint8Array, index: number, value: boolean): Uint8Array {
  if (index < 0 || index >= STATUS_LIST_BIT_SIZE) throw new Error("statusListIndex out of range");
  const next = new Uint8Array(list);
  const byte = Math.floor(index / 8);
  const bit = index % 8;
  if (value) next[byte] = next[byte]! | (1 << bit);
  else next[byte] = next[byte]! & ~(1 << bit);
  return next;
}

export function getBit(list: Uint8Array, index: number): boolean {
  if (index < 0 || index >= STATUS_LIST_BIT_SIZE) throw new Error("statusListIndex out of range");
  const byte = Math.floor(index / 8);
  const bit = index % 8;
  return ((list[byte] ?? 0) & (1 << bit)) !== 0;
}

/** Multibase base64url (u prefix) of GZIP-compressed bitstring. */
export function encodeStatusList(list: Uint8Array): string {
  const gz = gzipSync(Buffer.from(list));
  return `u${base64urlnopad.encode(new Uint8Array(gz))}`;
}

export function decodeStatusList(encoded: string): Uint8Array {
  if (!encoded.startsWith("u")) throw new Error("encodedList must be base64url multibase");
  const gz = base64urlnopad.decode(encoded.slice(1));
  const raw = gunzipSync(Buffer.from(gz));
  return new Uint8Array(raw);
}
