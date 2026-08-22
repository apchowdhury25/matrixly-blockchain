/** Published W3C credentialSchema (JsonSchema). Not a full JSON Schema 2020-12 processor. */

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

const HASH = /^sha256:[a-f0-9]{64}$/;

export function validateUniversityDegreeSubject(credential: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const types = credential.type;
  if (!Array.isArray(types) || !types.includes("UniversityDegreeCredential")) {
    errors.push("type must include UniversityDegreeCredential");
  }
  const subject = credential.credentialSubject as Record<string, unknown> | undefined;
  if (!subject || typeof subject !== "object") {
    errors.push("credentialSubject is required");
    return errors;
  }
  if (typeof subject.name !== "string" || subject.name.trim().length === 0) {
    errors.push("credentialSubject.name is required");
  }
  const degree = subject.degree as Record<string, unknown> | undefined;
  if (!degree || typeof degree !== "object") {
    errors.push("credentialSubject.degree is required");
  } else {
    if (typeof degree.type !== "string" || !degree.type) errors.push("degree.type is required");
    if (typeof degree.name !== "string" || !degree.name) errors.push("degree.name is required");
  }
  if (typeof subject.documentHash !== "string" || !HASH.test(subject.documentHash)) {
    errors.push("credentialSubject.documentHash must be sha256:<64 hex>");
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
