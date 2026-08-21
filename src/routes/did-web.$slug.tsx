import { createFileRoute } from "@tanstack/react-router";
import { PublicHeader } from "@/components/layout/public-header";
import { getDidWebDocument } from "@/lib/trust/functions";

export const Route = createFileRoute("/did-web/$slug")({
  loader: async ({ params }) => getDidWebDocument({ data: { slug: params.slug } }),
  component: DidWebPage,
});

function DidWebPage() {
  const data = Route.useLoaderData();
  return (
    <div className="min-h-screen bg-paper">
      <PublicHeader />
      <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <p className="font-mono text-xs tracking-[0.22em] text-pine uppercase">did:web</p>
        <h1 className="mt-3 font-display text-4xl">Hosted DID document</h1>
        <p className="mt-4 text-ink-soft">
          Published over HTTPS. The public key is in the document. Loopback and link-local hosts are
          refused. This method is a W3C CCG draft, not a Recommendation.
        </p>
        <p className="mt-4 break-all font-mono text-xs">{data.did}</p>
        <p className="mt-6 text-sm">
          <a href={`/api/v1/did-web/${data.slug}`} className="underline underline-offset-4">
            application/did+json
          </a>
        </p>
        <pre className="mt-6 overflow-x-auto rounded-xl border border-rule bg-paper-raised p-5 font-mono text-xs leading-relaxed">
          {JSON.stringify(data.document, null, 2)}
        </pre>
      </article>
    </div>
  );
}
