/**
 * RFC 8785 JSON Canonicalization Scheme (JCS).
 * Used by W3C Data Integrity eddsa-jcs-2022.
 *
 * Credentials in this platform only use JSON objects, arrays, strings, booleans,
 * null, and integers. Non-finite numbers are rejected.
 */
export function canonicalize(value: unknown): string {
  return serialize(value);
}

function serialize(value: unknown): string {
  if (value === null) return "null";
  const t = typeof value;
  if (t === "boolean") return value ? "true" : "false";
  if (t === "number") {
    if (!Number.isFinite(value as number)) {
      throw new Error("JCS: non-finite numbers are not allowed");
    }
    if (Object.is(value, -0)) return "0";
    return JSON.stringify(value);
  }
  if (t === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(serialize).join(",")}]`;
  }
  if (t === "object") {
    const rec = value as Record<string, unknown>;
    const keys = Object.keys(rec)
      .filter((k) => rec[k] !== undefined)
      .sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${serialize(rec[k])}`).join(",")}}`;
  }
  throw new Error(`JCS: unsupported type ${t}`);
}
