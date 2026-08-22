import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders, json } from "@/lib/api/http";
import { requestOrigin } from "@/lib/oid4vp/origin";
import { createStoredRequest } from "@/lib/oid4vp/persist";
import { ensureDemoSeed } from "@/lib/trust/seed";

export const Route = createFileRoute("/api/v1/oid4vp/requests")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: corsHeaders() }),
      POST: async ({ request }) => {
        try {
          await ensureDemoSeed();
          const origin = requestOrigin(request);
          let bodyOrigin = origin;
          try {
            const body = (await request.json()) as { origin?: string };
            if (typeof body.origin === "string" && /^https?:\/\//.test(body.origin)) {
              bodyOrigin = body.origin.replace(/\/$/, "");
            }
          } catch {
            /* origin from headers */
          }
          const stored = await createStoredRequest(bodyOrigin);
          return json({
            id: stored.id,
            request_uri: `${bodyOrigin}/api/v1/oid4vp/request/${stored.id}`,
            response_uri: stored.request.response_uri,
            wallet_uri: stored.walletUri,
            request: stored.request,
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
