import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders, json } from "@/lib/api/http";
import { buildLedgerExport, verifyExportedChain, assertExportHasNoHolderPii, LEDGER_DIPLOMA_DISCLAIMER } from "@/lib/ledger/export";
import { getLedger } from "@/lib/trust/runtime";
import { ensureDemoSeed } from "@/lib/trust/seed";

export const Route = createFileRoute("/api/v1/ledger/chain")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: corsHeaders() }),
      GET: async () => {
        await ensureDemoSeed();
        const ledger = await getLedger();
        if (ledger.name === "FabricLedgerAdapter") {
          return json(
            {
              chainValid: false,
              diplomaEvaluated: false,
              disclaimer: LEDGER_DIPLOMA_DISCLAIMER,
              model: "fabric-endorsement",
              reason: "Fabric chain export requires Gateway block data. Refusing to fake a hash-chain dump.",
            },
            503,
          );
        }
        const blocks = await ledger.listBlocks();
        assertExportHasNoHolderPii(blocks);
        const exported = buildLedgerExport(blocks, "hash-chain");
        const check = verifyExportedChain(exported);
        return json({ ...exported, ...check });
      },
    },
  },
});
