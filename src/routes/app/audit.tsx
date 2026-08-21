import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listAudit } from "@/lib/trust/functions";

export const Route = createFileRoute("/app/audit")({ component: AuditPage });

function AuditPage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof listAudit>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listAudit()
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <div>
      <h1 className="font-display text-4xl">Audit</h1>
      <p className="mt-2 text-ink-soft">
        Tenant events are hash-chained. A mutated row breaks the chain. Verification reports are signed
        separately and anchored by hash.
      </p>
      {error ? <p className="mt-4 text-invalid">{error}</p> : null}
      {data ? (
        <p className="mt-4 font-mono text-xs text-stone">
          Chain {data.chain.valid ? "intact" : "BROKEN"} · {data.chain.length} hashed events
          {data.chain.reason ? ` · ${data.chain.reason}` : ""}
        </p>
      ) : null}
      <ol className="mt-8 divide-y divide-rule overflow-hidden rounded-xl border border-rule bg-paper-raised">
        {(data?.events ?? []).map((r) => (
          <li key={r.id} className="px-4 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-mono text-xs">{r.action}</span>
              <span className="text-xs text-stone">{r.created_at}</span>
            </div>
            {r.event_hash ? (
              <p className="mt-1 truncate font-mono text-[11px] text-stone">{r.event_hash}</p>
            ) : null}
          </li>
        ))}
        {data && data.events.length === 0 ? <li className="px-4 py-8 text-sm text-stone">No events yet.</li> : null}
      </ol>
    </div>
  );
}
