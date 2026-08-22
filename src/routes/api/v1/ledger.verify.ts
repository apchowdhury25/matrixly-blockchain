import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders, json } from "@/lib/api/http";
import { verifyExportedChain } from "@/lib/ledger/export";

export const Route = createFileRoute("/api/v1/ledger/verify")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: corsHeaders() }),
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ chainValid: false, reason: "JSON body required", status: "INVALID", verified: false }, 400);
        }
        const check = verifyExportedChain(body);
        return json({
          chainValid: check.chainValid,
          length: check.length,
          model: check.model,
          genesis: check.genesis,
          head: check.head,
          reason: check.reason,
        });
      },
    },
  },
});
