import { decodeDidKey } from "../crypto/ed25519";
import { resolveDidKey, type DidResolution } from "./did";
import {
  buildDidWebDocument,
  didWebToHttpsUrl,
  isLocalDidWebHost,
  parseDidWeb,
  publicKeyMultibaseFromDocument,
  DID_WEB_METHOD,
} from "./did-web";

export type DidFetch = (url: string) => Promise<{ ok: boolean; status: number; json?: unknown; error?: string }>;

export type ResolveDidOptions = {
  fetch?: DidFetch;
  localDocument?: (did: string) => Record<string, unknown> | null | Promise<Record<string, unknown> | null>;
};

const defaultFetch: DidFetch = async (url) => {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { accept: "application/did+json, application/json" },
      redirect: "error",
    });
    if (!res.ok) return { ok: false, status: res.status, error: `HTTP ${res.status}` };
    return { ok: true, status: res.status, json: await res.json() };
  } catch (err) {
    return { ok: false, status: 0, error: (err as Error).message };
  }
};

export async function resolveDid(did: string, options: ResolveDidOptions = {}): Promise<DidResolution> {
  if (typeof did !== "string" || !did.startsWith("did:")) {
    return { ok: false, reason: "Not a DID" };
  }
  if (did.startsWith("did:key:")) return resolveDidKey(did);
  if (!did.startsWith("did:web:")) {
    return { ok: false, reason: `Unsupported DID method: ${did.split(":")[1] ?? "unknown"}` };
  }

  const parsed = parseDidWeb(did);
  if (!parsed.ok) return parsed;

  const local = options.localDocument
    ? await options.localDocument(did)
    : await (await import("./published")).loadPublishedDidWeb(did);
  if (local) return documentToResolution(did, local);

  if (isLocalDidWebHost(parsed.host) && !options.fetch) {
    return { ok: false, reason: "did:web document is not published on this deployment" };
  }

  const target = didWebToHttpsUrl(did);
  if (!target.ok) return target;
  const fetched = await (options.fetch ?? defaultFetch)(target.url);
  if (!fetched.ok || !fetched.json || typeof fetched.json !== "object") {
    return {
      ok: false,
      reason: `did:web fetch failed (${target.url}): ${fetched.error ?? "empty document"}`,
    };
  }
  return documentToResolution(did, fetched.json as Record<string, unknown>);
}

function documentToResolution(did: string, document: Record<string, unknown>): DidResolution {
  const extracted = publicKeyMultibaseFromDocument(document, did);
  if (!extracted.ok) return extracted;
  let publicKey: Uint8Array;
  try {
    publicKey = decodeDidKey(`did:key:${extracted.publicKeyMultibase}`);
  } catch (err) {
    return { ok: false, reason: (err as Error).message };
  }
  const normalized = buildDidWebDocument({
    did,
    publicKeyMultibase: extracted.publicKeyMultibase,
    alsoKnownAs: Array.isArray(document.alsoKnownAs)
      ? document.alsoKnownAs.filter((x): x is string => typeof x === "string")
      : undefined,
  });
  return {
    ok: true,
    method: DID_WEB_METHOD,
    did,
    publicKey,
    publicKeyMultibase: extracted.publicKeyMultibase,
    verificationMethod: extracted.verificationMethod,
    document: normalized,
  };
}
