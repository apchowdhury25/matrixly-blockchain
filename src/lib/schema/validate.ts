/**
 * Executes the published JsonSchema subset used by Matrixly Trust.
 * Supports: type, required, properties, minLength, pattern.
 * Does not implement $ref, if/then, unevaluatedProperties, or a full 2020-12 processor.
 */
export type PublishedSchema = {
  type?: string;
  required?: readonly string[];
  properties?: Record<string, PublishedSchema>;
  minLength?: number;
  pattern?: string;
};

export function validateAgainstSchema(
  value: unknown,
  schema: {
    type?: string;
    required?: readonly string[];
    properties?: Record<string, PublishedSchema>;
    minLength?: number;
    pattern?: string;
  },
  path = "$",
): string[] {
  const errors: string[] = [];
  if (schema.type === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      errors.push(`${path} must be an object`);
      return errors;
    }
    const rec = value as Record<string, unknown>;
    for (const key of schema.required ?? []) {
      if (rec[key] === undefined) errors.push(`${path}.${key} is required`);
    }
    for (const [key, child] of Object.entries(schema.properties ?? {})) {
      if (rec[key] === undefined) continue;
      errors.push(...validateAgainstSchema(rec[key], child, `${path}.${key}`));
    }
    return errors;
  }
  if (schema.type === "array") {
    if (!Array.isArray(value)) errors.push(`${path} must be an array`);
    return errors;
  }
  if (schema.type === "string") {
    if (typeof value !== "string") {
      errors.push(`${path} must be a string`);
      return errors;
    }
    if (schema.minLength && value.length < schema.minLength) {
      errors.push(`${path} is shorter than minLength ${schema.minLength}`);
    }
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      errors.push(`${path} does not match ${schema.pattern}`);
    }
  }
  return errors;
}
