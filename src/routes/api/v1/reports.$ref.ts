import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";
import { corsHeaders, json, unauthorized } from "@/lib/api/http";
import { authenticateApiKey } from "@/lib/api/service";
import { verifyVerificationReport } from "@/lib/verification/report";
import { getLedger } from "@/lib/trust/runtime";
import { canExportVerification } from "@/lib/tenancy/scope";
import { ensureDemoSeed } from "@/lib/trust/seed";

export const Route = createFileRoute("/api/v1/reports/$ref")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: corsHeaders() }),
      GET: async ({ request, params }) => {
        await ensureDemoSeed();
        const key = await authenticateApiKey(request.headers.get("authorization"));
        if (!key) return unauthorized();
        const sql = await getSql();
        const rows = await sql<{
          report_json: string | null;
          report_hash: string | null;
          result_status: string;
          tenant_id: string | null;
          api_key_id: string | null;
        }>`
          select report_json, report_hash, result_status, tenant_id, api_key_id
          from verification_requests
          where opaque_report_ref = ${params.ref}`;
        const row = rows[0];
        if (!row?.report_json) return json({ error: "Report not found", verified: false, status: "INVALID" }, 404);
        if (
          !canExportVerification({
            resourceTenantId: row.tenant_id,
            apiKeyId: row.api_key_id,
            actorTenantId: key.tenantId,
            actorApiKeyId: key.id,
          })
        ) {
          return json({ error: "Report not found", verified: false, status: "INVALID" }, 404);
        }
        const report = JSON.parse(row.report_json) as Record<string, unknown>;
        const proof = verifyVerificationReport(report);
        const ledger = await getLedger();
        const anchor = row.report_hash ? await ledger.getVerificationAnchor(row.report_hash) : null;
        return json({
          resultStatus: row.result_status,
          report,
          reportHash: row.report_hash,
          signatureValid: proof.ok,
          ledgerAnchored: Boolean(anchor),
        });
      },
    },
  },
});
