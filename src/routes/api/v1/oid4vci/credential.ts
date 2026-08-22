import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders, json } from "@/lib/api/http";
import { oauthError } from "@/lib/oid4vci/http";
import { issueCredentialFromToken } from "@/lib/oid4vci/persist";
import { ensureDemoSeed } from "@/lib/trust/seed";

export const Route = createFileRoute("/api/v1/oid4vci/credential")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: corsHeaders() }),
      POST: async ({ request }) => {
        await ensureDemoSeed();
        let body: Record<string, unknown> = {};
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          body = {};
        }
        const result = await issueCredentialFromToken({
          authorization: request.headers.get("authorization"),
          body,
        });
        if (!result.ok) return oauthError(result.status, result.error, result.error_description);
        return json(result.body);
      },
    },
  },
});
