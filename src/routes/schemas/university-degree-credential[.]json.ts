import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders, json } from "@/lib/api/http";
import { UNIVERSITY_DEGREE_SCHEMA } from "@/lib/schema/university-degree";

export const Route = createFileRoute("/schemas/university-degree-credential.json")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: corsHeaders() }),
      GET: () => json(UNIVERSITY_DEGREE_SCHEMA, 200, { "content-type": "application/schema+json; charset=utf-8" }),
    },
  },
});
