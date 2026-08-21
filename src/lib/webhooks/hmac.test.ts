import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assertWebhookUrl,
  generateWebhookSecret,
  signWebhookPayload,
  verifyWebhookSignature,
  WEBHOOK_SECRET_PREFIX,
} from "./hmac";

test("HMAC sign/verify round-trips and detects tampering", () => {
  const { secret } = generateWebhookSecret();
  assert.equal(secret.startsWith(WEBHOOK_SECRET_PREFIX), true);
  const payload = JSON.stringify({ status: "VALID", verified: true });
  const signed = signWebhookPayload(secret, payload, "2026-08-21T18:00:00.000Z");
  assert.equal(verifyWebhookSignature(secret, payload, signed.header), true);
  assert.equal(verifyWebhookSignature(secret, payload.replace("VALID", "INVALID"), signed.header), false);
  assert.equal(verifyWebhookSignature(secret + "x", payload, signed.header), false);
});

test("refuses to sign without a webhook secret", () => {
  assert.throws(() => signWebhookPayload("", "{}"), /Refusing to send an unsigned/);
  assert.throws(() => signWebhookPayload("not-a-secret", "{}"), /Refusing to send an unsigned/);
});

test("webhook URL must be https except example.test", () => {
  assert.equal(assertWebhookUrl("https://hooks.bank.example/matrixly").startsWith("https://"), true);
  assert.equal(assertWebhookUrl("http://events.example.test/hook").includes("example.test"), true);
  assert.throws(() => assertWebhookUrl("http://evil.example/hook"), /https/);
  assert.throws(() => assertWebhookUrl("javascript:alert(1)"), /not valid|https/);
  assert.throws(() => assertWebhookUrl("https://169.254.169.254/latest"), /not allowed/);
  assert.throws(() => assertWebhookUrl("https://127.0.0.1/hook"), /not allowed/);
});
