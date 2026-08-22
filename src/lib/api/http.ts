export function json(data: unknown, status = 200, extra?: HeadersInit): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...corsHeaders(),
      ...extra,
    },
  });
}

export function corsHeaders(): Record<string, string> {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "authorization, content-type",
    "access-control-allow-methods": "GET, POST, OPTIONS",
  };
}

export function unauthorized(): Response {
  return json(
    {
      error: "Missing or invalid API key",
      status: "UNAUTHORIZED",
      verified: false,
    },
    401,
  );
}

export function rateLimited(retryAfterSec: number): Response {
  return json(
    {
      error: "Rate limit exceeded",
      status: "RATE_LIMITED",
      verified: false,
    },
    429,
    { "retry-after": String(retryAfterSec) },
  );
}
