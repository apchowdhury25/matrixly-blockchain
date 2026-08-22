import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders, json } from "@/lib/api/http";
import { LEDGER_DIPLOMA_DISCLAIMER } from "@/lib/ledger/disclaimer";
import { verifyCredentialInclusionProof } from "@/lib/ledger/proof";

export const Route = createFileRoute("/api/v1/ledger/proof/verify")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: corsHeaders() }),
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json(
            {
              included: false,
              diplomaEvaluated: false,
              disclaimer: LEDGER_DIPLOMA_DISCLAIMER,
              reason: "JSON body required",
            },
            400,
          );
        }
        const check = verifyCredentialInclusionProof(body);
        return json(check);
      },
    },
  },
});
