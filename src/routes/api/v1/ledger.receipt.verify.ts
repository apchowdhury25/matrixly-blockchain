import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders, json } from "@/lib/api/http";
import { RECEIPT_DISCLAIMER, verifyLedgerReceipt } from "@/lib/ledger/receipt";

export const Route = createFileRoute("/api/v1/ledger/receipt/verify")({
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
              receiptValid: false,
              diplomaEvaluated: false,
              disclaimer: RECEIPT_DISCLAIMER,
              included: false,
              signatureValid: false,
              rootsMatch: false,
              reason: "JSON body required",
            },
            400,
          );
        }
        return json(verifyLedgerReceipt(body));
      },
    },
  },
});
