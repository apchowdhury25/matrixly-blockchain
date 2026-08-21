import { createFileRoute } from "@tanstack/react-router";
import { PublicHeader } from "@/components/layout/public-header";
import { getEvidencePack } from "@/lib/trust/functions";

export const Route = createFileRoute("/evidence/$ref")({
  loader: async ({ params }) => getEvidencePack({ data: { ref: params.ref } }),
  component: EvidencePage,
});

function EvidencePage() {
  const pack = Route.useLoaderData();
  const json = JSON.stringify(pack, null, 2);
  return (
    <div className="min-h-screen bg-paper">
      <PublicHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <p className="font-mono text-xs tracking-[0.18em] text-pine uppercase">Evidence pack</p>
        <h1 className="mt-2 font-display text-4xl">{pack.status}</h1>
        <p className="mt-2 text-ink-soft">
          Hashes, signed verification report, and ledger flags. No original PDF and no holder name.
          Adapter: {pack.adapter} ({pack.integrityModel}).
        </p>
        <dl className="mt-8 space-y-3 rounded-xl border border-rule bg-paper-raised px-5 py-5 text-sm">
          <div>
            <dt className="text-stone">Report signature</dt>
            <dd>{pack.reportSignatureValid ? "PASS" : "FAIL"}</dd>
          </div>
          <div>
            <dt className="text-stone">Ledger anchor</dt>
            <dd>{pack.ledgerAnchored ? "PASS" : "FAIL"}</dd>
          </div>
          <div>
            <dt className="text-stone">Credential hash</dt>
            <dd className="break-all font-mono text-xs">{pack.credentialHash}</dd>
          </div>
          <div>
            <dt className="text-stone">Document hash</dt>
            <dd className="break-all font-mono text-xs">{pack.documentHash}</dd>
          </div>
        </dl>
        <pre className="mt-8 overflow-x-auto rounded-xl border border-rule bg-paper-raised p-4 font-mono text-xs leading-relaxed">
          {json}
        </pre>
      </main>
    </div>
  );
}
