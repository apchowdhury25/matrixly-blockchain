import assert from "node:assert/strict";
import { test } from "node:test";
import { createRateLimiter } from "./rate-limit";

test("allows up to max hits then refuses without a VALID payload", () => {
  let now = 1_000;
  const limiter = createRateLimiter({ windowMs: 1_000, max: 3, now: () => now });
  assert.equal(limiter.allow("k").ok, true);
  assert.equal(limiter.allow("k").ok, true);
  assert.equal(limiter.allow("k").ok, true);
  const denied = limiter.allow("k");
  assert.equal(denied.ok, false);
  if (!denied.ok) assert.equal(denied.retryAfterSec >= 1, true);
});

test("window expiry restores capacity; keys are isolated", () => {
  let now = 5_000;
  const limiter = createRateLimiter({ windowMs: 1_000, max: 1, now: () => now });
  assert.equal(limiter.allow("a").ok, true);
  assert.equal(limiter.allow("a").ok, false);
  assert.equal(limiter.allow("b").ok, true);
  now = 6_100;
  assert.equal(limiter.allow("a").ok, true);
});
