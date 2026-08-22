export function requestOrigin(request: Request): string {
  const header = request.headers.get("origin");
  if (header && header.startsWith("http")) return header.replace(/\/$/, "");
  try {
    const u = new URL(request.url);
    if (u.origin && u.origin !== "null") return u.origin;
  } catch {
    /* relative Request.url */
  }
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}`;
  return "https://trust.matrixly.ai";
}
