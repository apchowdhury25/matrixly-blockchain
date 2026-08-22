import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders, json } from "@/lib/api/http";
import { simulateOid4vpWallet } from "@/lib/trust/functions";
import { ensureDemoSeed } from "@/lib/trust/seed";

export const Route = createFileRoute("/api/v1/oid4vp/preview-wallet/$id")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: corsHeaders() }),
      POST: async ({ params }) => {
        await ensureDemoSeed();
        try {
          const stored = await simulateOid4vpWallet({ data: { id: params.id } });
          return json({
            status: stored.result?.status ?? "INVALID",
            verified: stored.result?.verified ?? false,
            nonceBound: stored.result?.nonceBound ?? false,
            holderProofValid: stored.result?.holderProofValid ?? false,
            reasons: stored.result?.reasons ?? [],
            issuerDid: stored.result?.issuerDid,
            note: "Preview wallet. Not an EUDI or HAIP-certified wallet.",
          });
        } catch (err) {
          return json(
            { error: (err as Error).message, verified: false, status: "INVALID" },
            400,
          );
        }
      },
    },
  },
});
