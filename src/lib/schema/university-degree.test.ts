import assert from "node:assert/strict";
import { test } from "node:test";
import {
  UNIVERSITY_DEGREE_SCHEMA,
  UNIVERSITY_DEGREE_SCHEMA_ID,
  validateCredentialSchema,
} from "./university-degree";

const valid = {
  type: ["VerifiableCredential", "UniversityDegreeCredential"],
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
