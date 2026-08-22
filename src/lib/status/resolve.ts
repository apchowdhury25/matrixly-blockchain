/** Resolve credentialStatus.statusListCredential from its URL. Fail closed. */

const PRIVATE_HOST = /^(localhost|127\.0\.0\.1|::1|0\.0\.0\.0|169\.254\.169\.254)$/i;
const RFC1918 = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/;

export const LOCAL_STATUS_HOST = "trust.matrixly.ai";

export type StatusListResolveOptions = {
  loader?: (url: string) => Promise<Record<string, unknown> | null>;
  fetchImpl?: typeof fetch;
};

export function isPublishedStatusUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname === LOCAL_STATUS_HOST && u.pathname.startsWith("/credentials/status/");
  } catch {
    return false;
  }
}

export function assertStatusListUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Status list URL is not valid");
  }
  const host = url.hostname.toLowerCase();
  if (PRIVATE_HOST.test(host) || host.endsWith(".internal") || RFC1918.test(host)) {
    throw new Error("Status list URL is not allowed (loopback, link-local, or private network)");
  }
  if (url.protocol !== "https:" && !(url.protocol === "http:" && host.endsWith(".example.test"))) {
    throw new Error("Status list URL must be https");
  }
  return url;
}

export async function resolveStatusListCredential(
  url: string,
  options?: StatusListResolveOptions,
): Promise<{ ok: true; credential: Record<string, unknown> } | { ok: false; reason: string }> {
  if (!url || typeof url !== "string") {
    return { ok: false, reason: "credentialStatus.statusListCredential is missing" };
  }
  if (options?.loader && (isPublishedStatusUrl(url) || url.startsWith("/"))) {
    const doc = await options.loader(url);
    if (!doc) return { ok: false, reason: `Status list credential was not found at ${url}` };
    return { ok: true, credential: doc };
  }
  try {
    assertStatusListUrl(url);
  } catch (err) {
    return { ok: false, reason: (err as Error).message };
  }
  if (options?.loader) {
    const doc = await options.loader(url);
    if (doc) return { ok: true, credential: doc };
  }
  const fetchImpl = options?.fetchImpl ?? fetch;
  try {
    const res = await fetchImpl(url, {
      redirect: "error",
      headers: { accept: "application/vc+ld+json, application/json" },
    });
    if (!res.ok) return { ok: false, reason: `Status list fetch failed (${res.status})` };
    const credential = (await res.json()) as Record<string, unknown>;
    if (!credential || typeof credential !== "object") {
      return { ok: false, reason: "Status list response is not a JSON object" };
    }
    return { ok: true, credential };
  } catch (err) {
    return { ok: false, reason: `Status list could not be fetched: ${(err as Error).message}` };
  }
}
