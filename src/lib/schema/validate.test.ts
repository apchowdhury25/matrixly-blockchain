import assert from "node:assert/strict";
import { test } from "node:test";
import { UNIVERSITY_DEGREE_SCHEMA } from "./university-degree";
import { validateAgainstSchema, type PublishedSchema } from "./validate";

const schema = UNIVERSITY_DEGREE_SCHEMA as PublishedSchema;

test("published schema accepts a complete diploma body", () => {
  const errors = validateAgainstSchema(
    {
      type: ["VerifiableCredential", "UniversityDegreeCredential"],
      issuer: { id: "did:key:z" },
      validFrom: "2026-08-20T00:00:00.000Z",
      credentialSubject: {
        name: "Alex",
        degree: { type: "BachelorDegree", name: "BCS" },
        documentHash: "sha256:" + "ab".repeat(32),
      },
    },
    schema,
  );
  assert.deepEqual(errors, []);
});

test("missing required subject fields fail closed", () => {
  const errors = validateAgainstSchema(
    {
      type: ["VerifiableCredential"],
      issuer: {},
      validFrom: "2026-08-20T00:00:00.000Z",
      credentialSubject: { name: "" },
    },
    schema,
  );
  assert.match(errors.join(" "), /degree is required/);
  assert.match(errors.join(" "), /documentHash is required/);
  assert.match(errors.join(" "), /minLength/);
});

test("documentHash pattern is enforced from the schema document", () => {
  const errors = validateAgainstSchema(
    {
      type: [],
      issuer: {},
      validFrom: "x",
      credentialSubject: {
        name: "A",
        degree: { type: "B", name: "C" },
        documentHash: "md5:deadbeef",
      },
    },
    schema,
  );
  assert.match(errors.join(" "), /documentHash/);
});
