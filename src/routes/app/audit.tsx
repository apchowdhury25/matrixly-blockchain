import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listAudit } from "@/lib/trust/functions";

export const Route = createFileRoute("/app/audit")({ component: AuditPage });

function AuditPage() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listAudit>>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listAudit()
      .then(setRows)
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <div>
      <h1 className="font-display text-4xl">Audit</h1>
      <p className="mt-2 text-ink-soft">Append-only events for this tenant. Payloads are minimized.</p>
      {error ? <p className="mt-4 text-invalid">{error}</p> : null}
      <ol className="mt-8 divide-y divide-rule overflow-hidden rounded-xl border border-rule bg-paper-raised">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3">
            <span className="font-mono text-xs">{r.action}</span>
            <span className="text-xs text-stone">{r.created_at}</span>
          </li>
        ))}
        {rows.length === 0 ? <li className="px-4 py-8 text-sm text-stone">No events yet.</li> : null}
      </ol>
    </div>
  );
}
