import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders, json } from "@/lib/api/http";
import { oauthError, readFormOrJson } from "@/lib/oid4vci/http";
import { exchangePreAuthorizedCode } from "@/lib/oid4vci/persist";
import { ensureDemoSeed } from "@/lib/trust/seed";

export const Route = createFileRoute("/api/v1/oid4vci/token")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: corsHeaders() }),
      POST: async ({ request }) => {
        await ensureDemoSeed();
        let form: Record<string, string>;
        try {
          form = await readFormOrJson(request);
        } catch {
          return oauthError(400, "invalid_request", "Token request must be form or JSON");
        }
        const result = await exchangePreAuthorizedCode(form);
        if (!result.ok) return oauthError(result.status, result.error, result.error_description);
        return json({
          access_token: result.access_token,
          token_type: result.token_type,
          expires_in: result.expires_in,
        });
      },
    },
  },
});
