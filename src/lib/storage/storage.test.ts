import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { sha256Bytes } from "../crypto/hash";
import { FilesystemObjectStore } from "./fs";
import { S3ObjectStore } from "./s3";
import { storageBackend } from "./adapter";

test("filesystem put/get preserves SHA-256", async () => {
  const root = await mkdtemp(join(tmpdir(), "matrixly-obj-"));
  try {
    const store = new FilesystemObjectStore(root);
    const bytes = new TextEncoder().encode("%PDF-1.7 storage-phase");
    await store.put("obj-1.pdf", bytes, "application/pdf");
    const got = await store.get("obj-1.pdf");
    assert.equal(sha256Bytes(got).prefixed, sha256Bytes(bytes).prefixed);
    assert.equal(store.keepsBytesInDb, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("S3 without a bucket refuses to fake storage", async () => {
  const store = new S3ObjectStore();
  await assert.rejects(() => store.put("x", new Uint8Array([1]), "application/pdf"), /Refusing to fake/);
});

test("STORAGE_BACKEND defaults to db", () => {
  const prev = process.env.STORAGE_BACKEND;
  delete process.env.STORAGE_BACKEND;
  assert.equal(storageBackend(), "db");
  if (prev !== undefined) process.env.STORAGE_BACKEND = prev;
});

test("STORAGE_BACKEND=s3 is selected from env (bucket check is at factory time)", () => {
  const prev = process.env.STORAGE_BACKEND;
  process.env.STORAGE_BACKEND = "s3";
  assert.equal(storageBackend(), "s3");
  if (prev !== undefined) process.env.STORAGE_BACKEND = prev;
  else delete process.env.STORAGE_BACKEND;
});
