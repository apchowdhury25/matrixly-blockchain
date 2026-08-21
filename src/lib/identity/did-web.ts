/** did:web (W3C CCG). HTTPS DID documents. Not a W3C Recommendation. */

import type { DidJson } from "./did";

const PRIVATE_HOST =
  /^(localhost|127\.0\.0\.1|::1|0\.0\.0\.0|169\.254\.169\.254)$/i;
const RFC1918 = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/;

export const DID_WEB_METHOD = "web" as const;
export const LOCAL_DID_WEB_HOST = "matrixly.example.test";

export function parseDidWeb(did: string):
  | { ok: true; did: string; host: string; pathSegments: string[] }
  | { ok: false; reason: string } {
  if (!did.startsWith("did:web:")) {
    return { ok: false, reason: "Not a did:web identifier" };
  }
  const specific = did.slice("did:web:".length);
  if (!specific) return { ok: false, reason: "did:web is missing a host" };
  const parts = specific.split(":").map((p) => {
    try {
      return decodeURIComponent(p);
    } catch {
      return p;
    }
  });
  const host = parts[0]?.toLowerCase() ?? "";
  if (!host) return { ok: false, reason: "did:web host is empty" };
  return { ok: true, did, host, pathSegments: parts.slice(1) };
}

export function didWebToHttpsUrl(did: string): { ok: true; url: string } | { ok: false; reason: string } {
  const parsed = parseDidWeb(did);
  if (!parsed.ok) return parsed;
  try {
    assertDidWebHost(parsed.host);
  } catch (err) {
    return { ok: false, reason: (err as Error).message };
  }
  const path =
    parsed.pathSegments.length === 0
      ? "/.well-known/did.json"
      : `/${parsed.pathSegments.map(encodeURIComponent).join("/")}/did.json`;
  return { ok: true, url: `https://${parsed.host}${path}` };
}

export function assertDidWebHost(host: string): void {
  const h = host.toLowerCase();
  if (PRIVATE_HOST.test(h) || h.endsWith(".internal") || RFC1918.test(h)) {
    throw new Error("did:web host is not allowed (loopback, link-local, or private network)");
  }
}

export function isLocalDidWebHost(host: string): boolean {
  const h = host.split(":")[0]?.toLowerCase() ?? "";
  return h === LOCAL_DID_WEB_HOST || h === "example.test" || h.endsWith(".example.test");
}

export function didWebForTenant(slug: string, host = LOCAL_DID_WEB_HOST): string {
  return `did:web:${host}:issuers:${slug}`;
}

export function verificationMethodForDid(did: string, publicKeyMultibase: string): string {
  return `${did}#${publicKeyMultibase}`;
}

export function buildDidWebDocument(input: {
  did: string;
  publicKeyMultibase: string;
  alsoKnownAs?: string[];
}): DidJson {
  const vm = verificationMethodForDid(input.did, input.publicKeyMultibase);
  return {
    "@context": ["https://www.w3.org/ns/did/v1", "https://w3id.org/security/multikey/v1"],
    id: input.did,
    controller: input.did,
    ...(input.alsoKnownAs?.length ? { alsoKnownAs: input.alsoKnownAs } : {}),
    verificationMethod: [
      {
        id: vm,
        type: "Multikey",
        controller: input.did,
        publicKeyMultibase: input.publicKeyMultibase,
      },
    ],
    authentication: [vm],
    assertionMethod: [vm],
  };
}

export function publicKeyMultibaseFromDocument(
  document: Record<string, unknown>,
  did: string,
  verificationMethod?: string,
): { ok: true; publicKeyMultibase: string; verificationMethod: string } | { ok: false; reason: string } {
  if (document.id !== did) {
    return { ok: false, reason: "DID document id does not match the identifier" };
  }
  const methods = document.verificationMethod;
  if (!Array.isArray(methods) || methods.length === 0) {
    return { ok: false, reason: "DID document has no verificationMethod" };
  }
  const rec = methods.find((m) => {
    if (!m || typeof m !== "object") return false;
    const row = m as { id?: string; publicKeyMultibase?: string };
    if (verificationMethod && row.id !== verificationMethod) return false;
    return typeof row.publicKeyMultibase === "string";
  }) as { id?: string; publicKeyMultibase?: string } | undefined;
  const chosen =
    rec ??
    (methods[0] as { id?: string; publicKeyMultibase?: string } | undefined);
  if (!chosen?.publicKeyMultibase?.startsWith("z")) {
    return { ok: false, reason: "DID document does not contain an Ed25519 Multikey" };
  }
  return {
    ok: true,
    publicKeyMultibase: chosen.publicKeyMultibase,
    verificationMethod: chosen.id ?? verificationMethodForDid(did, chosen.publicKeyMultibase),
  };
}
