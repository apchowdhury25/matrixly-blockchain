import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders, json } from "@/lib/api/http";
import { STH_DISCLAIMER, verifyTreeHead } from "@/lib/ledger/sth";

export const Route = createFileRoute("/api/v1/ledger/sth/verify")({
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
              signatureValid: false,
              diplomaEvaluated: false,
              disclaimer: STH_DISCLAIMER,
              reason: "JSON body required",
            },
            400,
          );
        }
        const url = new URL(request.url);
        const expected = url.searchParams.get("merkleRoot") ?? undefined;
        const check = verifyTreeHead(body, expected ?? undefined);
        return json(check);
      },
    },
  },
});
