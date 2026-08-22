import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders, json } from "@/lib/api/http";
import { liveness } from "@/lib/ops/health";

export const Route = createFileRoute("/healthz")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: corsHeaders() }),
      GET: () => json(liveness()),
    },
  },
});
