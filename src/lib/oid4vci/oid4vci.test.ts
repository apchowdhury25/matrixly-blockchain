import assert from "node:assert/strict";
import { test } from "node:test";
import { CONFIG_ID, LDP_VC, PRE_AUTH_GRANT, REFUSED_FORMATS } from "./constants";
import { credentialIssuerMetadata } from "./metadata";
import { buildCredentialOffer, credentialOfferUri, parseCredentialOffer } from "./offer";
import { credentialResponse, parseCredentialRequest, parseTokenRequest } from "./protocol";
import { generateAccessToken, hashVciToken, parseVciBearer } from "./tokens";

test("issuer metadata advertises ldp_vc and not SD-JWT", () => {
  const meta = credentialIssuerMetadata("https://issuer.example.test");
  assert.equal(meta.credential_issuer, "https://issuer.example.test");
  assert.match(meta.credential_endpoint, /\/api\/v1\/oid4vci\/credential$/);
  assert.match(meta.token_endpoint, /\/api\/v1\/oid4vci\/token$/);
  const config = meta.credential_configurations_supported[CONFIG_ID];
  assert.equal(config.format, LDP_VC);
  assert.equal("dc+sd-jwt" in meta.credential_configurations_supported, false);
});

test("credential offer uses pre-authorized_code and the offer URI scheme", () => {
  const offer = buildCredentialOffer("https://issuer.example.test/", "demo-claim-valid-bcs");
  assert.equal(offer.credential_configuration_ids[0], CONFIG_ID);
  assert.equal(offer.grants[PRE_AUTH_GRANT]["pre-authorized_code"], "demo-claim-valid-bcs");
  const uri = credentialOfferUri("https://issuer.example.test", "demo-claim-valid-bcs");
  assert.match(uri, /^openid-credential-offer:\/\//);
  const parsed = parseCredentialOffer(offer);
  assert.equal(parsed.ok, true);
  assert.equal(parseCredentialOffer({ credential_issuer: "https://x" }).ok, false);
});

test("token endpoint refuses authorization_code and missing pre-authorized_code", () => {
  const auth = parseTokenRequest({ grant_type: "authorization_code", code: "abc" });
  assert.equal(auth.ok, false);
  if (!auth.ok) assert.equal(auth.error, "unsupported_grant_type");
  const missing = parseTokenRequest({ grant_type: PRE_AUTH_GRANT });
  assert.equal(missing.ok, false);
  const ok = parseTokenRequest({ grant_type: PRE_AUTH_GRANT, "pre-authorized_code": "demo-claim-valid-bcs" });
  assert.equal(ok.ok, true);
});

test("credential request refuses SD-JWT formats and unknown configuration ids", () => {
  assert.equal(REFUSED_FORMATS.has("dc+sd-jwt"), true);
  const sd = parseCredentialRequest({ format: "dc+sd-jwt", credential_configuration_id: CONFIG_ID });
  assert.equal(sd.ok, false);
  if (!sd.ok) assert.equal(sd.error, "unsupported_credential_format");
  const unknown = parseCredentialRequest({ credential_configuration_id: "mdoc_degree" });
  assert.equal(unknown.ok, false);
  const ok = parseCredentialRequest({ credential_configuration_id: CONFIG_ID });
  assert.equal(ok.ok, true);
});

test("credential response is OpenID4VCI 1.0 credentials array wrapping the W3C VC", () => {
  const vc = { type: ["VerifiableCredential", "UniversityDegreeCredential"], id: "urn:uuid:demo" };
  const body = credentialResponse(vc);
  assert.equal(Array.isArray(body.credentials), true);
  assert.equal(body.credentials[0]?.credential, vc);
  assert.equal("credential" in body, false);
});

test("VCI access tokens hash at rest and parse Bearer mtx_vci_", () => {
  const token = generateAccessToken();
  assert.equal(token.secret.startsWith("mtx_vci_"), true);
  assert.equal(hashVciToken(token.secret), token.hash);
  assert.equal(parseVciBearer(`Bearer ${token.secret}`), token.secret);
  assert.equal(parseVciBearer("Bearer mtx_live_not_a_vci_token_value_here"), null);
});
