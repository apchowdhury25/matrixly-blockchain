import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders, json } from "@/lib/api/http";
import { LEDGER_DIPLOMA_DISCLAIMER, verifyExportedChain } from "@/lib/ledger/export";

export const Route = createFileRoute("/api/v1/ledger/verify")({
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
              chainValid: false,
              diplomaEvaluated: false,
              disclaimer: LEDGER_DIPLOMA_DISCLAIMER,
              reason: "JSON body required",
            },
            400,
          );
        }
        const check = verifyExportedChain(body);
        return json({
          chainValid: check.chainValid,
          diplomaEvaluated: check.diplomaEvaluated,
          disclaimer: check.disclaimer,
          length: check.length,
          model: check.model,
          genesis: check.genesis,
          merkleRoot: check.merkleRoot,
          merkleAlgorithm: check.merkleAlgorithm,
          head: check.head,
          reason: check.reason,
        });
      },
    },
  },
});
