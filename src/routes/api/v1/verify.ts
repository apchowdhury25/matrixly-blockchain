import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders, json, rateLimited, unauthorized } from "@/lib/api/http";
import { verifierRateLimiter } from "@/lib/api/rate-limit";
import { authenticateApiKey, runApiVerification } from "@/lib/api/service";
import { ensureDemoSeed } from "@/lib/trust/seed";

export const Route = createFileRoute("/api/v1/verify")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: corsHeaders() }),
      POST: async ({ request }) => {
        await ensureDemoSeed();
        const key = await authenticateApiKey(request.headers.get("authorization"));
        if (!key) return unauthorized();
        const limited = verifierRateLimiter.allow(key.id);
        if (!limited.ok) return rateLimited(limited.retryAfterSec);
        let body: Record<string, unknown>;
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return json({ error: "JSON body required", verified: false, status: "INVALID" }, 400);
        }
        const ref = typeof body.ref === "string" ? body.ref : undefined;
        const documentB64 = typeof body.documentB64 === "string" ? body.documentB64 : undefined;
        const mode = body.mode === "none" ? "none" : "bound";
        const includeSubject = body.includeSubject === true;
        const credential =
          body.credential && typeof body.credential === "object"
            ? (body.credential as Record<string, unknown>)
            : undefined;
        const presentation =
          body.presentation && typeof body.presentation === "object"
            ? (body.presentation as Record<string, unknown>)
            : undefined;
        try {
          const result = await runApiVerification({
            apiKey: key,
            ref,
            credential,
            presentation,
            documentB64,
            mode,
            includeSubject,
          });
          return json(result);
        } catch (err) {
          return json(
            { error: (err as Error).message, verified: false, status: "INVALID" },
            400,
          );
        }
      },
    },
  },
});
