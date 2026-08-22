import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders, json } from "@/lib/api/http";
import { decodeSecretKeyHex } from "@/lib/crypto/ed25519";
import { STH_DISCLAIMER, treeHeadFromBlocks } from "@/lib/ledger/sth";
import { getLedger, getPlatformVerifier } from "@/lib/trust/runtime";
import { openSecret } from "@/lib/trust/seal";
import { ensureDemoSeed } from "@/lib/trust/seed";

export const Route = createFileRoute("/api/v1/ledger/sth")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: corsHeaders() }),
      GET: async () => {
        await ensureDemoSeed();
        const ledger = await getLedger();
        if (ledger.name === "FabricLedgerAdapter") {
          return json(
            {
              signatureValid: false,
              diplomaEvaluated: false,
              disclaimer: STH_DISCLAIMER,
              reason: "Fabric signed tree heads require Gateway block data",
            },
            503,
          );
        }
        const blocks = await ledger.listBlocks();
        const verifier = await getPlatformVerifier();
        const secretKey = decodeSecretKeyHex(openSecret(verifier.secretKeyHex));
        const sth = treeHeadFromBlocks(blocks, verifier.did, secretKey);
        return json(sth);
      },
    },
  },
});
