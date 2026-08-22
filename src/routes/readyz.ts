import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders, json } from "@/lib/api/http";
import { readiness } from "@/lib/ops/health";

export const Route = createFileRoute("/readyz")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: corsHeaders() }),
      GET: async () => {
        const body = await readiness();
        return json(body, body.ready ? 200 : 503);
      },
    },
  },
});
