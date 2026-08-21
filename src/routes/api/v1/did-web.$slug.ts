import { createFileRoute } from "@tanstack/react-router";
import { getDidWebDocument } from "@/lib/trust/functions";

export const Route = createFileRoute("/api/v1/did-web/$slug")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const data = await getDidWebDocument({ data: { slug: params.slug } });
          return new Response(JSON.stringify(data.document, null, 2), {
            headers: {
              "content-type": "application/did+json; charset=utf-8",
              "cache-control": "no-store",
            },
          });
        } catch (err) {
          return new Response(JSON.stringify({ error: (err as Error).message }), {
            status: 404,
            headers: { "content-type": "application/json" },
          });
        }
      },
    },
  },
});
