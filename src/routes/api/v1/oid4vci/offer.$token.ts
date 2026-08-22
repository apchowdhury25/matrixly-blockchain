import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders, json } from "@/lib/api/http";
import { buildCredentialOffer, credentialOfferUri } from "@/lib/oid4vci/offer";
import { resetDemoPreAuthorizedCode } from "@/lib/oid4vci/persist";
import { requestOrigin } from "@/lib/oid4vp/origin";
import { ensureDemoSeed } from "@/lib/trust/seed";

export const Route = createFileRoute("/api/v1/oid4vci/offer/$token")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: corsHeaders() }),
      GET: async ({ request, params }) => {
        await ensureDemoSeed();
        await resetDemoPreAuthorizedCode(params.token);
        const origin = requestOrigin(request);
        return json({
          offer: buildCredentialOffer(origin, params.token),
          credential_offer_uri: credentialOfferUri(origin, params.token),
        });
      },
    },
  },
});
