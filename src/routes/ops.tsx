import { createFileRoute } from "@tanstack/react-router";
import { PublicHeader } from "@/components/layout/public-header";
import { getRuntimeOps } from "@/lib/trust/functions";

export const Route = createFileRoute("/ops")({
  loader: () => getRuntimeOps(),
  component: OpsPage,
});

function OpsPage() {
  const data = Route.useLoaderData();
  return (
    <div className="min-h-screen bg-paper">
      <PublicHeader />
      <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <p className="font-mono text-xs tracking-[0.22em] text-pine uppercase">Operations</p>
        <h1 className="mt-3 font-display text-4xl">Runtime</h1>
        <p className="mt-4 text-ink-soft">
          Liveness and readiness are public machine endpoints. A missing Fabric Gateway fails closed
          — this page will not show a fake ledger. Verifier API keys are rate-limited; 429 never
          returns VALID.
        </p>
        <dl className="mt-8 space-y-4 rounded-xl border border-rule bg-paper-raised px-5 py-5 text-sm">
          <div>
            <dt className="text-stone">Ready</dt>
            <dd className={data.ready ? "text-valid" : "text-invalid"}>{data.ready ? "Yes" : "No"}</dd>
          </div>
          <div>
            <dt className="text-stone">Database</dt>
            <dd>{data.db ? "Connected" : "Not connected"}</dd>
          </div>
          <div>
            <dt className="text-stone">Ledger adapter</dt>
            <dd className="font-mono text-xs">{data.ledger}</dd>
          </div>
          <div>
            <dt className="text-stone">Storage</dt>
            <dd className="font-mono text-xs">{data.storage}</dd>
          </div>
          <div>
            <dt className="text-stone">KMS</dt>
            <dd className="font-mono text-xs">{data.kms}</dd>
          </div>
          {data.reason ? (
            <div>
              <dt className="text-stone">Reason</dt>
              <dd className="text-invalid">{data.reason}</dd>
            </div>
          ) : null}
        </dl>
        <p className="mt-6 font-mono text-xs text-stone">
          GET /healthz · GET /readyz · 429 RATE_LIMITED is not VALID
        </p>
      </main>
    </div>
  );
}
