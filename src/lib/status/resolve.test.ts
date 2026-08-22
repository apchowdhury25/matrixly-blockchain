import assert from "node:assert/strict";
import { test } from "node:test";
import { assertStatusListUrl, isPublishedStatusUrl, resolveStatusListCredential } from "./resolve";

test("published Matrixly status URLs are local", () => {
  assert.equal(isPublishedStatusUrl("https://trust.matrixly.ai/credentials/status/demo"), true);
  assert.equal(isPublishedStatusUrl("https://evil.example/credentials/status/demo"), false);
});

test("SSRF: loopback and link-local status URLs fail closed", () => {
  assert.throws(() => assertStatusListUrl("http://127.0.0.1/status"), /not allowed/);
  assert.throws(() => assertStatusListUrl("https://169.254.169.254/latest/meta-data"), /not allowed/);
  assert.throws(() => assertStatusListUrl("https://10.0.0.5/list"), /not allowed/);
});

test("resolver uses the loader for published URLs and does not fetch", async () => {
  const credential = { type: ["VerifiableCredential", "BitstringStatusListCredential"] };
  const resolved = await resolveStatusListCredential("https://trust.matrixly.ai/credentials/status/demo", {
    loader: async () => credential,
    fetchImpl: (async () => {
      throw new Error("network should not be used for published URLs");
    }) as typeof fetch,
  });
  assert.equal(resolved.ok, true);
  if (resolved.ok) assert.equal(resolved.credential, credential);
});

test("missing local status list fails closed", async () => {
  const resolved = await resolveStatusListCredential("https://trust.matrixly.ai/credentials/status/missing", {
    loader: async () => null,
  });
  assert.equal(resolved.ok, false);
  if (!resolved.ok) assert.match(resolved.reason, /not found/);
});

test("remote fetch is used for non-local https URLs", async () => {
  const credential = { id: "https://issuer.example.test/status/1", type: ["BitstringStatusListCredential"] };
  const resolved = await resolveStatusListCredential("https://issuer.example.test/status/1", {
    fetchImpl: (async () =>
      new Response(JSON.stringify(credential), { status: 200 })) as typeof fetch,
  });
  assert.equal(resolved.ok, true);
});
