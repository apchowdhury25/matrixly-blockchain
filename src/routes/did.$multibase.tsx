import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PublicHeader } from "@/components/layout/public-header";
import { resolveDidDocument } from "@/lib/trust/functions";

export const Route = createFileRoute("/did/$multibase")({ component: DidPage });

function DidPage() {
  const { multibase } = Route.useParams();
  const [data, setData] = useState<Awaited<ReturnType<typeof resolveDidDocument>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    resolveDidDocument({ data: { multibase } })
      .then((r) => {
        if (alive) setData(r);
      })
      .catch((err: Error) => {
        if (alive) setError(err.message);
      });
    return () => {
      alive = false;
    };
  }, [multibase]);

  return (
    <div className="min-h-screen bg-paper">
      <PublicHeader />
      <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <p className="font-mono text-xs tracking-[0.22em] text-pine uppercase">DID resolution</p>
        <h1 className="mt-3 font-display text-4xl">did:key</h1>
        {error ? <p className="mt-6 text-invalid">{error}</p> : null}
        {!data && !error ? <div className="mt-8 h-40 animate-pulse rounded-xl bg-rule/40" /> : null}
        {data && !data.ok ? (
          <p className="mt-6 text-invalid">{data.reason}</p>
        ) : null}
        {data && data.ok ? (
          <div className="mt-8 space-y-6">
            <div className="rounded-xl border border-rule bg-paper-raised p-5">
              <p className="text-sm text-stone">Identifier</p>
              <p className="mt-2 break-all font-mono text-xs leading-relaxed">{data.did}</p>
              <p className="mt-4 text-sm text-stone">Registry</p>
              <p className="mt-1 text-sm">
                {data.registered ? data.registryStatus : "Valid did:key, not registered on this ledger"}
              </p>
              <p className="mt-4 text-sm text-stone">Document hash</p>
              <p className="mt-1 break-all font-mono text-xs">{data.documentHash}</p>
            </div>
            <pre className="overflow-x-auto rounded-xl border border-rule bg-paper-raised p-5 font-mono text-xs leading-relaxed text-ink-soft">
              {JSON.stringify(data.document, null, 2)}
            </pre>
          </div>
        ) : null}
      </article>
    </div>
  );
}
