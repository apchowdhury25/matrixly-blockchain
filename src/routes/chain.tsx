import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PublicHeader } from "@/components/layout/public-header";
import { Button } from "@/components/ui/button";
import { getPublicLedgerExport, verifyPublicLedgerExport } from "@/lib/trust/functions";

export const Route = createFileRoute("/chain")({
  loader: () => getPublicLedgerExport(),
  component: ChainPage,
});

function ChainPage() {
  const data = Route.useLoaderData();
  const [paste, setPaste] = useState("");
  const [independent, setIndependent] = useState<Awaited<ReturnType<typeof verifyPublicLedgerExport>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const parsed = JSON.parse(paste);
      setIndependent(await verifyPublicLedgerExport({ data: { exportJson: JSON.stringify(parsed) } }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      <PublicHeader />
      <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <p className="font-mono text-xs tracking-[0.22em] text-pine uppercase">Independent ledger</p>
        <h1 className="mt-3 font-display text-4xl">Hash-chain export</h1>
        <p className="mt-4 text-ink-soft">
          Download the append-only log and recompute block hashes yourself. A green application badge
          is not this check. This export is hashes and DIDs — not PDFs. Fabric dumps are refused
          without Gateway block data.
        </p>
        <dl className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-rule bg-paper-raised p-5">
            <dt className="text-sm text-stone">Independent check</dt>
            <dd className={data.chainValid ? "text-valid" : "text-invalid"}>
              {data.chainValid ? "Chain intact" : data.reason ?? "Broken"}
            </dd>
          </div>
          <div className="rounded-xl border border-rule bg-paper-raised p-5">
            <dt className="text-sm text-stone">Blocks</dt>
            <dd className="font-display text-3xl tabular-nums">{data.length}</dd>
          </div>
        </dl>
        <p className="mt-4 break-all font-mono text-xs text-stone">Head {data.head?.blockHash ?? "—"}</p>
        <p className="mt-6 text-sm">
          <a href="/api/v1/ledger/chain" className="underline underline-offset-4">
            GET /api/v1/ledger/chain
          </a>
          {" · "}
          POST /api/v1/ledger/verify does not return credential VALID
        </p>

        <form className="mt-10 space-y-3" onSubmit={onVerify}>
          <label className="text-sm font-medium">Paste an export (optional)</label>
          <textarea
            className="h-40 w-full rounded-sm border border-rule bg-paper-raised p-3 font-mono text-xs"
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder='{"format":"matrixly.ledger.v1",...}'
          />
          <Button type="submit" disabled={busy || !paste.trim()}>
            {busy ? "Checking…" : "Recompute hashes"}
          </Button>
        </form>
        {error ? <p className="mt-4 text-invalid">{error}</p> : null}
        {independent ? (
          <p className={`mt-4 ${independent.chainValid ? "text-valid" : "text-invalid"}`}>
            {independent.chainValid
              ? `Independent check intact · ${independent.length} blocks`
              : independent.reason ?? "Broken"}
          </p>
        ) : null}
      </main>
    </div>
  );
}
