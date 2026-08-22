import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders, json } from "@/lib/api/http";
import { credentialIssuerMetadata } from "@/lib/oid4vci/metadata";
import { requestOrigin } from "@/lib/oid4vp/origin";
import { ensureDemoSeed } from "@/lib/trust/seed";

export const Route = createFileRoute("/api/v1/oid4vci/metadata")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: corsHeaders() }),
      GET: async ({ request }) => {
        await ensureDemoSeed();
        return json(credentialIssuerMetadata(requestOrigin(request)));
      },
    },
  },
});
