import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders, json } from "@/lib/api/http";
import { decodeSecretKeyHex } from "@/lib/crypto/ed25519";
import { buildBlockInclusionProof, findCredentialBlockIndex } from "@/lib/ledger/proof";
import { RECEIPT_DISCLAIMER, buildLedgerReceipt } from "@/lib/ledger/receipt";
import { treeHeadFromBlocks } from "@/lib/ledger/sth";
import { getLedger, getPlatformVerifier } from "@/lib/trust/runtime";
import { openSecret } from "@/lib/trust/seal";
import { ensureDemoSeed } from "@/lib/trust/seed";

export const Route = createFileRoute("/api/v1/ledger/receipt")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: corsHeaders() }),
      GET: async ({ request }) => {
        await ensureDemoSeed();
        const ledger = await getLedger();
        if (ledger.name === "FabricLedgerAdapter") {
          return json(
            {
              receiptValid: false,
              diplomaEvaluated: false,
              disclaimer: RECEIPT_DISCLAIMER,
              reason: "Fabric receipts require Gateway block data",
            },
            503,
          );
        }
        const credentialHash = new URL(request.url).searchParams.get("credentialHash") ?? "";
        if (!credentialHash.startsWith("sha256:")) {
          return json(
            {
              receiptValid: false,
              diplomaEvaluated: false,
              disclaimer: RECEIPT_DISCLAIMER,
              reason: "Provide credentialHash",
            },
            400,
          );
        }
        const blocks = await ledger.listBlocks();
        const index = findCredentialBlockIndex(blocks, credentialHash);
        if (index < 0) {
          return json(
            {
              receiptValid: false,
              diplomaEvaluated: false,
              disclaimer: RECEIPT_DISCLAIMER,
              reason: "No matching CREDENTIAL block",
            },
            404,
          );
        }
        const built = buildBlockInclusionProof(blocks, index, credentialHash);
        if (!built.ok) {
          return json(
            { receiptValid: false, diplomaEvaluated: false, disclaimer: RECEIPT_DISCLAIMER, reason: built.reason },
            400,
          );
        }
        const verifier = await getPlatformVerifier();
        const secretKey = decodeSecretKeyHex(openSecret(verifier.secretKeyHex));
        const sth = treeHeadFromBlocks(blocks, verifier.did, secretKey);
        return json(buildLedgerReceipt(built.proof, sth, credentialHash));
      },
    },
  },
});
