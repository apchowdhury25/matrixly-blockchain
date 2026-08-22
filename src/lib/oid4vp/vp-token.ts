/** OpenID4VP 1.0 §8.1 VP Token. Object keyed by DCQL credential query id. */

export function parseVpToken(
  raw: unknown,
  queryId: string,
): { ok: true; presentations: Record<string, unknown>[] } | { ok: false; reason: string } {
  if (raw === undefined || raw === null) return { ok: false, reason: "vp_token is missing" };
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed.startsWith("eyJ")) {
      return { ok: false, reason: "JWT / SD-JWT vp_token is not implemented; send a W3C Verifiable Presentation" };
    }
    try {
      return parseVpToken(JSON.parse(trimmed), queryId);
    } catch {
      return { ok: false, reason: "vp_token string is not JSON" };
    }
  }
  if (typeof raw !== "object") return { ok: false, reason: "vp_token must be a JSON object" };
  const rec = raw as Record<string, unknown>;
  if (Array.isArray(rec.type) && rec.type.includes("VerifiablePresentation")) {
    return { ok: true, presentations: [rec] };
  }
  const slot = rec[queryId];
  if (slot === undefined) {
    return { ok: false, reason: `vp_token has no presentation for DCQL id "${queryId}"` };
  }
  const list = Array.isArray(slot) ? slot : [slot];
  const presentations: Record<string, unknown>[] = [];
  for (const item of list) {
    if (typeof item === "string" && item.startsWith("eyJ")) {
      return { ok: false, reason: "JWT / SD-JWT presentation is not implemented" };
    }
    if (typeof item === "string") {
      try {
        const parsed = JSON.parse(item) as unknown;
        if (parsed && typeof parsed === "object") presentations.push(parsed as Record<string, unknown>);
        else return { ok: false, reason: "vp_token presentation JSON is invalid" };
      } catch {
        return { ok: false, reason: "vp_token presentation is not JSON" };
      }
    } else if (item && typeof item === "object") {
      presentations.push(item as Record<string, unknown>);
    } else {
      return { ok: false, reason: "vp_token presentation is empty" };
    }
  }
  if (!presentations.length) return { ok: false, reason: "vp_token contains no presentations" };
  return { ok: true, presentations };
}
