import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getLedgerSummary } from "@/lib/trust/functions";

export const Route = createFileRoute("/app/ledger")({ component: LedgerPage });

function LedgerPage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getLedgerSummary>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getLedgerSummary()
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) return <p className="text-invalid">{error}</p>;
  if (!data) return <div className="h-48 animate-pulse rounded-xl bg-rule/40" />;

  return (
    <div>
      <h1 className="font-display text-4xl">Ledger</h1>
      <p className="mt-2 text-ink-soft">
        Adapter: {data.adapter} · integrity {data.integrityModel}. Storage: {data.storage}. KMS: {data.kms}.
        Chain {data.chain.valid ? "intact" : "BROKEN"} · {data.chain.length} blocks.
        Fabric is a separate adapter and will not fake confirmations.
      </p>
      <div className="mt-8 overflow-x-auto rounded-xl border border-rule bg-paper-raised">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-rule text-stone">
            <tr>
              <th className="px-4 py-3 font-medium">Seq</th>
              <th className="px-4 py-3 font-medium">Kind</th>
              <th className="px-4 py-3 font-medium">Block hash</th>
            </tr>
          </thead>
          <tbody>
            {data.blocks.map((b) => (
              <tr key={b.seq} className="border-b border-rule/70 last:border-0">
                <td className="px-4 py-3 font-mono text-xs tabular-nums">{b.seq}</td>
                <td className="px-4 py-3">{b.kind}</td>
                <td className="px-4 py-3 font-mono text-[11px] break-all">{b.blockHash}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
