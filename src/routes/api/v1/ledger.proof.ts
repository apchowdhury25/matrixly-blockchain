import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders, json } from "@/lib/api/http";
import { LEDGER_DIPLOMA_DISCLAIMER } from "@/lib/ledger/disclaimer";
import { buildBlockInclusionProof, findCredentialBlockIndex } from "@/lib/ledger/proof";
import { getLedger } from "@/lib/trust/runtime";
import { ensureDemoSeed } from "@/lib/trust/seed";

export const Route = createFileRoute("/api/v1/ledger/proof")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: corsHeaders() }),
      GET: async ({ request }) => {
        await ensureDemoSeed();
        const ledger = await getLedger();
        if (ledger.name === "FabricLedgerAdapter") {
          return json(
            {
              included: false,
              diplomaEvaluated: false,
              disclaimer: LEDGER_DIPLOMA_DISCLAIMER,
              reason: "Fabric inclusion proofs require Gateway block data",
            },
            503,
          );
        }
        const url = new URL(request.url);
        const credentialHash = url.searchParams.get("credentialHash") ?? "";
        const seqRaw = url.searchParams.get("seq");
        const blocks = await ledger.listBlocks();
        let index = -1;
        if (credentialHash.startsWith("sha256:")) {
          index = findCredentialBlockIndex(blocks, credentialHash);
        } else if (seqRaw) {
          const seq = Number(seqRaw);
          index = blocks.findIndex((b) => b.seq === seq);
        } else {
          return json(
            {
              included: false,
              diplomaEvaluated: false,
              disclaimer: LEDGER_DIPLOMA_DISCLAIMER,
              reason: "Provide credentialHash or seq",
            },
            400,
          );
        }
        if (index < 0) {
          return json(
            {
              included: false,
              diplomaEvaluated: false,
              disclaimer: LEDGER_DIPLOMA_DISCLAIMER,
              reason: "No matching CREDENTIAL block",
            },
            404,
          );
        }
        const built = buildBlockInclusionProof(blocks, index, credentialHash || undefined);
        if (!built.ok) {
          return json(
            { included: false, diplomaEvaluated: false, disclaimer: LEDGER_DIPLOMA_DISCLAIMER, reason: built.reason },
            400,
          );
        }
        return json(built.proof);
      },
    },
  },
});
