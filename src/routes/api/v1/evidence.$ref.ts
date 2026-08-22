import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";
import { corsHeaders, json, unauthorized } from "@/lib/api/http";
import { authenticateApiKey } from "@/lib/api/service";
import { canExportVerification } from "@/lib/tenancy/scope";
import { getEvidencePack } from "@/lib/trust/functions";
import { ensureDemoSeed } from "@/lib/trust/seed";

export const Route = createFileRoute("/api/v1/evidence/$ref")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: corsHeaders() }),
      GET: async ({ request, params }) => {
        await ensureDemoSeed();
        const key = await authenticateApiKey(request.headers.get("authorization"));
        if (!key) return unauthorized();
        const sql = await getSql();
        const rows = await sql<{ tenant_id: string | null; api_key_id: string | null }>`
          select tenant_id, api_key_id from verification_requests
          where opaque_report_ref = ${params.ref} or opaque_ref = ${params.ref}
          order by created_at desc limit 1`;
        const row = rows[0];
        if (
          !row ||
          !canExportVerification({
            resourceTenantId: row.tenant_id,
            apiKeyId: row.api_key_id,
            actorTenantId: key.tenantId,
            actorApiKeyId: key.id,
          })
        ) {
          return json({ error: "Evidence pack not found", verified: false, status: "INVALID" }, 404);
        }
        try {
          const pack = await getEvidencePack({ data: { ref: params.ref } });
          return json(pack);
        } catch (err) {
          return json({ error: (err as Error).message, verified: false, status: "INVALID" }, 404);
        }
      },
    },
  },
});
