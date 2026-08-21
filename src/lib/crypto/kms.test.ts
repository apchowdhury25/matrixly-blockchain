import assert from "node:assert/strict";
import { test } from "node:test";
import { AwsKmsWrapping, LocalAesGcmKms, getKms } from "./kms";

test("local AES-GCM wrap round-trips", () => {
  const kms = new LocalAesGcmKms();
  const sealed = kms.wrap("deadbeef");
  assert.notEqual(sealed, "deadbeef");
  assert.equal(kms.unwrap(sealed), "deadbeef");
});

test("AWS KMS adapter refuses to wrap locally while claiming AWS", () => {
  const kms = new AwsKmsWrapping("alias/matrixly");
  assert.throws(() => kms.wrap("deadbeef"), /Refusing to wrap/);
});

test("KMS_BACKEND=aws without KMS_KEY_ID fails closed", () => {
  const prevB = process.env.KMS_BACKEND;
  const prevK = process.env.KMS_KEY_ID;
  process.env.KMS_BACKEND = "aws";
  delete process.env.KMS_KEY_ID;
  assert.throws(() => getKms(), /KMS_KEY_ID/);
  if (prevB !== undefined) process.env.KMS_BACKEND = prevB;
  else delete process.env.KMS_BACKEND;
  if (prevK !== undefined) process.env.KMS_KEY_ID = prevK;
});
