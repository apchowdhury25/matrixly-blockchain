import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders, json } from "@/lib/api/http";
import { loadPublishedStatusList } from "@/lib/status/local";
import { LOCAL_STATUS_HOST } from "@/lib/status/resolve";
import { ensureDemoSeed } from "@/lib/trust/seed";

export const Route = createFileRoute("/credentials/status/$id")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: corsHeaders() }),
      GET: async ({ params }) => {
        await ensureDemoSeed();
        const slug = params.id;
        const url = `https://${LOCAL_STATUS_HOST}/credentials/status/${slug}`;
        const credential = (await loadPublishedStatusList(url)) ?? (await loadPublishedStatusList(slug));
        if (!credential) {
          return json({ error: "Status list credential was not found", verified: false, status: "INVALID" }, 404);
        }
        return json(credential, 200, { "content-type": "application/vc+ld+json; charset=utf-8" });
      },
    },
  },
});
