import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders, json } from "@/lib/api/http";
import { loadStoredRequest } from "@/lib/oid4vp/persist";
import { ensureDemoSeed } from "@/lib/trust/seed";

export const Route = createFileRoute("/api/v1/oid4vp/request/$id")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: corsHeaders() }),
      GET: async ({ params }) => {
        await ensureDemoSeed();
        const stored = await loadStoredRequest(params.id);
        if (!stored) return json({ error: "OpenID4VP request not found" }, 404);
        return json(stored.request);
      },
    },
  },
});
