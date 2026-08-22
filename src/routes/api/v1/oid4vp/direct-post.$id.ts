import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders, json } from "@/lib/api/http";
import { submitStoredResponse } from "@/lib/oid4vp/persist";
import { ensureDemoSeed } from "@/lib/trust/seed";

export const Route = createFileRoute("/api/v1/oid4vp/direct-post/$id")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: corsHeaders() }),
      POST: async ({ request, params }) => {
        await ensureDemoSeed();
        const contentType = request.headers.get("content-type") ?? "";
        let vpToken: unknown;
        let state: string | undefined;
        try {
          if (contentType.includes("application/json")) {
            const body = (await request.json()) as Record<string, unknown>;
            vpToken = body.vp_token ?? body.vpToken;
            state = typeof body.state === "string" ? body.state : undefined;
          } else {
            const form = await request.formData();
            const raw = form.get("vp_token") ?? form.get("vpToken");
            state = String(form.get("state") ?? "") || undefined;
            if (typeof raw === "string") {
              try {
                vpToken = JSON.parse(raw);
              } catch {
                vpToken = raw;
              }
            }
          }
        } catch {
          return json({ error: "Could not parse OpenID4VP response", verified: false, status: "INVALID" }, 400);
        }
        try {
          const stored = await submitStoredResponse({ id: params.id, vpToken, state });
          return json({
            status: stored.result?.status ?? "INVALID",
            verified: stored.result?.verified ?? false,
            nonceBound: stored.result?.nonceBound ?? false,
            reasons: stored.result?.reasons ?? [],
          });
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
