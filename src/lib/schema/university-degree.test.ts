import assert from "node:assert/strict";
import { test } from "node:test";
import { publishedSchemaRecord, schemaDocumentHash } from "./anchor";
import {
  UNIVERSITY_DEGREE_SCHEMA,
  UNIVERSITY_DEGREE_SCHEMA_ID,
  validateCredentialSchema,
} from "./university-degree";

const valid = {
  type: ["VerifiableCredential", "UniversityDegreeCredential"],
  issuer: { id: "did:key:zTest" },
  validFrom: "2026-08-20T00:00:00.000Z",
  credentialSchema: { id: UNIVERSITY_DEGREE_SCHEMA_ID, type: "JsonSchema" },
  credentialSubject: {
    name: "Alex Rivera",
    degree: { type: "BachelorDegree", name: "Bachelor of Computer Science" },
    documentHash: "sha256:" + "ab".repeat(32),
  },
};

test("published schema id is stable", () => {
  assert.equal(UNIVERSITY_DEGREE_SCHEMA.$id, UNIVERSITY_DEGREE_SCHEMA_ID);
  assert.match(UNIVERSITY_DEGREE_SCHEMA_ID, /university-degree-credential\.json$/);
});

test("valid university degree subject passes JsonSchema checks", () => {
  assert.deepEqual(validateCredentialSchema(valid), []);
});

test("missing documentHash fails closed", () => {
  const bad = {
    ...valid,
    credentialSubject: { name: "Alex", degree: { type: "BachelorDegree", name: "BCS" } },
  };
  const errors = validateCredentialSchema(bad);
  assert.equal(errors.length > 0, true);
  assert.match(errors.join(" "), /documentHash/);
});

test("unknown schema id is refused, never skipped", () => {
  const errors = validateCredentialSchema({
    ...valid,
    credentialSchema: { id: "https://evil.example/schema.json", type: "JsonSchema" },
  });
  assert.match(errors.join(" "), /Unknown credentialSchema/);
});

test("absent schema is not an error (legacy credentials still verify)", () => {
  const { credentialSchema: _omit, ...legacy } = valid;
  assert.deepEqual(validateCredentialSchema(legacy), []);
});

test("issue refuses a subject that fails the published schema", async () => {
  const { issueCredential } = await import("../credentials/issue");
  const { generateEd25519KeyPair, encodeDidKey } = await import("../crypto/ed25519");
  const keys = generateEd25519KeyPair();
  try {
    issueCredential({
      credentialId: "urn:uuid:bad-schema",
      issuerDid: encodeDidKey(keys.publicKey),
      issuerName: "Global University",
      subjectName: "",
      degreeName: "Bachelor of Computer Science",
      validFrom: "2026-08-20T00:00:00.000Z",
      documentHash: "sha256:" + "ab".repeat(32),
      statusListCredentialId: "https://trust.matrixly.ai/credentials/status/demo",
      statusListIndex: 0,
      secretKey: keys.secretKey,
    });
    assert.fail("issued empty name");
  } catch (err) {
    assert.match((err as Error).message, /JsonSchema|minLength/);
  }
});

test("schema hash is JCS SHA-256 of the published document", () => {
  const rec = publishedSchemaRecord();
  assert.equal(rec.schemaId, UNIVERSITY_DEGREE_SCHEMA_ID);
  assert.equal(rec.schemaHash, schemaDocumentHash(UNIVERSITY_DEGREE_SCHEMA));
  assert.match(rec.schemaHash, /^sha256:[a-f0-9]{64}$/);
  const tampered = { ...UNIVERSITY_DEGREE_SCHEMA, title: "Evil" };
  assert.notEqual(schemaDocumentHash(tampered), rec.schemaHash);
});
