import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders, json, unauthorized } from "@/lib/api/http";
import { authenticateApiKey } from "@/lib/api/service";
import { getEvidencePack } from "@/lib/trust/functions";
import { ensureDemoSeed } from "@/lib/trust/seed";

export const Route = createFileRoute("/api/v1/evidence/$ref")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: corsHeaders() }),
      GET: async ({ request, params }) => {
        await ensureDemoSeed();
        const key = await authenticateApiKey(request.headers.get("authorization"));
        if (!key) return unauthorized();
        try {
          const pack = await getEvidencePack({ data: { ref: params.ref } });
          return json(pack);
        } catch (err) {
          return json({ error: (err as Error).message }, 404);
        }
      },
    },
  },
});
