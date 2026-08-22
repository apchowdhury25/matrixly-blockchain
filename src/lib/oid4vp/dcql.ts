/** Digital Credentials Query Language (OpenID4VP 1.0 §6). */

export const LDP_VC = "ldp_vc";
export const REFUSED_FORMATS = new Set(["dc+sd-jwt", "vc+sd-jwt", "mso_mdoc", "jwt_vc_json", "jwt_vp_json"]);

export type DcqlClaim = { path: Array<string | number> };
export type DcqlCredentialQuery = {
  id: string;
  format: string;
  meta?: { type_values?: string[][]; vct_values?: string[] };
  claims?: DcqlClaim[];
};
export type DcqlQuery = { credentials: DcqlCredentialQuery[] };

export function defaultDegreeDcql(): DcqlQuery {
  return {
    credentials: [
      {
        id: "degree",
        format: LDP_VC,
        meta: { type_values: [["VerifiableCredential", "UniversityDegreeCredential"]] },
        claims: [
          { path: ["credentialSubject", "degree", "name"] },
          { path: ["credentialSubject", "documentHash"] },
        ],
      },
    ],
  };
}

export function parseDcqlQuery(raw: unknown): { ok: true; query: DcqlQuery } | { ok: false; reason: string } {
  if (!raw || typeof raw !== "object") return { ok: false, reason: "dcql_query must be a JSON object" };
  const credentials = (raw as { credentials?: unknown }).credentials;
  if (!Array.isArray(credentials) || credentials.length === 0) {
    return { ok: false, reason: "dcql_query.credentials must be a non-empty array" };
  }
  const parsed: DcqlCredentialQuery[] = [];
  for (const item of credentials) {
    if (!item || typeof item !== "object") return { ok: false, reason: "DCQL credential query is invalid" };
    const rec = item as Record<string, unknown>;
    if (typeof rec.id !== "string" || !rec.id) return { ok: false, reason: "DCQL credential id is required" };
    if (typeof rec.format !== "string" || !rec.format) return { ok: false, reason: "DCQL format is required" };
    parsed.push({
      id: rec.id,
      format: rec.format,
      meta: rec.meta && typeof rec.meta === "object" ? (rec.meta as DcqlCredentialQuery["meta"]) : undefined,
      claims: Array.isArray(rec.claims) ? (rec.claims as DcqlClaim[]) : undefined,
    });
  }
  return { ok: true, query: { credentials: parsed } };
}

export function matchCredentialToDcql(
  credential: Record<string, unknown>,
  query: DcqlCredentialQuery,
): { ok: true } | { ok: false; reason: string } {
  if (REFUSED_FORMATS.has(query.format)) {
    return { ok: false, reason: `Credential format ${query.format} is not implemented (OpenID4VP W3C ldp_vc only)` };
  }
  if (query.format !== LDP_VC) {
    return { ok: false, reason: `Unsupported DCQL format ${query.format}` };
  }
  const types = Array.isArray(credential.type) ? credential.type.map(String) : [];
  const wanted = query.meta?.type_values;
  if (wanted?.length) {
    const matches = wanted.some((set) => set.every((t) => types.includes(t)));
    if (!matches) {
      return { ok: false, reason: "Credential type does not satisfy dcql_query.meta.type_values" };
    }
  }
  for (const claim of query.claims ?? []) {
    if (readPath(credential, claim.path) === undefined) {
      return { ok: false, reason: `Claim path ${claim.path.join(".")} is missing` };
    }
  }
  return { ok: true };
}

function readPath(root: unknown, path: Array<string | number>): unknown {
  let cur: unknown = root;
  for (const part of path) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string | number, unknown>)[part];
  }
  return cur;
}
