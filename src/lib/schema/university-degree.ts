/** Published W3C credentialSchema (JsonSchema). Instance checks use the schema document. Not a full 2020-12 processor. */

import { validateAgainstSchema, type PublishedSchema } from "./validate";

export const UNIVERSITY_DEGREE_SCHEMA_ID =
  "https://trust.matrixly.ai/schemas/university-degree-credential.json";

export const UNIVERSITY_DEGREE_SCHEMA = {
  $id: UNIVERSITY_DEGREE_SCHEMA_ID,
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "UniversityDegreeCredential",
  type: "object",
  required: ["type", "issuer", "validFrom", "credentialSubject"],
  properties: {
    type: { type: "array" },
    credentialSubject: {
      type: "object",
      required: ["name", "degree", "documentHash"],
      properties: {
        name: { type: "string", minLength: 1 },
        degree: {
          type: "object",
          required: ["type", "name"],
          properties: {
            type: { type: "string", minLength: 1 },
            name: { type: "string", minLength: 1 },
          },
        },
        documentHash: { type: "string", pattern: "^sha256:[a-f0-9]{64}$" },
      },
    },
  },
} as const;

export function validateUniversityDegreeSubject(credential: Record<string, unknown>): string[] {
  const errors = validateAgainstSchema(credential, UNIVERSITY_DEGREE_SCHEMA as PublishedSchema);
  const types = credential.type;
  if (Array.isArray(types) && !types.includes("UniversityDegreeCredential")) {
    errors.push("type must include UniversityDegreeCredential");
  }
  return errors;
}

export function validateCredentialSchema(credential: Record<string, unknown>): string[] {
  const schema = credential.credentialSchema as { id?: string; type?: string } | undefined;
  if (!schema) return [];
  if (schema.type !== "JsonSchema") {
    return [`credentialSchema.type ${schema.type ?? "(missing)"} is not supported; JsonSchema is required`];
  }
  if (schema.id !== UNIVERSITY_DEGREE_SCHEMA_ID) {
    return [`Unknown credentialSchema.id ${schema.id ?? "(missing)"}. Refusing to skip schema validation.`];
  }
  return validateUniversityDegreeSubject(credential);
}
