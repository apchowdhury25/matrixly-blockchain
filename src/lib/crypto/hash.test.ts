import assert from "node:assert/strict";
import { test } from "node:test";
import { sha256Bytes, hashesEqual } from "./hash";
import { inspectBytes } from "./inspect";

test("SHA-256 empty vector", () => {
  const h = sha256Bytes(new Uint8Array());
  assert.equal(h.hex, "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  assert.equal(h.prefixed, "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  assert.equal(h.byteLength, 0);
});

test("SHA-256 abc vector", () => {
  const h = sha256Bytes(new TextEncoder().encode("abc"));
  assert.equal(h.hex, "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});

test("modified bytes produce a different hash", () => {
  const a = sha256Bytes(new TextEncoder().encode("diploma"));
  const b = sha256Bytes(new TextEncoder().encode("Diploma"));
  assert.equal(hashesEqual(a.prefixed, a.prefixed), true);
  assert.equal(a.hex === b.hex, false);
});

test("content inspection trusts magic bytes, not names", () => {
  const pdf = inspectBytes(new TextEncoder().encode("%PDF-1.7\n% demo"));
  assert.equal(pdf.kind, "pdf");
  assert.throws(() => inspectBytes(new TextEncoder().encode("MZ executable")));
  assert.throws(() => inspectBytes(new Uint8Array()));
});
