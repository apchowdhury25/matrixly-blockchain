import assert from "node:assert/strict";
import { test } from "node:test";
import { merkleRootFromBlockHashes } from "./merkle";

const H1 = "sha256:" + "11".repeat(32);
const H2 = "sha256:" + "22".repeat(32);
const H3 = "sha256:" + "33".repeat(32);

test("empty tree is SHA-256 of empty bytes", () => {
  const empty = merkleRootFromBlockHashes([]);
  assert.equal(empty.algorithm, "rfc6962-sha256");
  assert.equal(empty.merkleRoot, "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
});

test("root changes when a leaf is swapped", () => {
  const a = merkleRootFromBlockHashes([H1, H2]);
  const b = merkleRootFromBlockHashes([H2, H1]);
  assert.notEqual(a.merkleRoot, b.merkleRoot);
});

test("odd leaf is promoted, not hashed with itself", () => {
  const three = merkleRootFromBlockHashes([H1, H2, H3]);
  const two = merkleRootFromBlockHashes([H1, H2]);
  assert.notEqual(three.merkleRoot, two.merkleRoot);
});
