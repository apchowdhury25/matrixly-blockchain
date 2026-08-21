import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicHeader } from "@/components/layout/public-header";
import { getPublicVerificationReport } from "@/lib/trust/functions";

export const Route = createFileRoute("/report/$ref")({
  loader: async ({ params }) => getPublicVerificationReport({ data: { ref: params.ref } }),
  component: ReportPage,
});

function ReportPage() {
  const data = Route.useLoaderData();
  const { ref } = Route.useParams();
  const report = JSON.parse(data.reportJson) as {
    result?: string;
    credentialId?: string;
    credentialHash?: string;
    documentHash?: string;
    policyId?: string;
    verifier?: { id?: string };
    created?: string;
  };
  return (
    <div className="min-h-screen bg-paper">
      <PublicHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <p className="font-mono text-xs tracking-[0.18em] text-pine uppercase">Verification report</p>
        <h1 className="mt-2 font-display text-4xl">{data.resultStatus}</h1>
        <p className="mt-2 text-ink-soft">
          This is a signed statement by the platform verifier. The ledger stores the report hash, not
          the report body, and not holder names.
        </p>
        <dl className="mt-8 space-y-4 rounded-xl border border-rule bg-paper-raised px-5 py-5 text-sm">
          <div>
            <dt className="text-stone">Report signature</dt>
            <dd>{data.signatureValid ? "PASS" : data.signatureReason ?? "FAIL"}</dd>
          </div>
          <div>
            <dt className="text-stone">Ledger anchor</dt>
            <dd>{data.ledgerAnchored && data.chainValid ? "PASS" : "FAIL"}</dd>
          </div>
          <div>
            <dt className="text-stone">Policy</dt>
            <dd className="font-mono text-xs">{report.policyId}</dd>
          </div>
          <div>
            <dt className="text-stone">Verifier DID</dt>
            <dd className="break-all font-mono text-xs">{data.verifierDid ?? report.verifier?.id}</dd>
          </div>
          <div>
            <dt className="text-stone">Credential hash</dt>
            <dd className="break-all font-mono text-xs">{report.credentialHash}</dd>
          </div>
          <div>
            <dt className="text-stone">Report hash</dt>
            <dd className="break-all font-mono text-xs">{data.reportHash}</dd>
          </div>
        </dl>
        <p className="mt-6 text-sm">
          <Link to="/evidence/$ref" params={{ ref }} className="underline underline-offset-4">
            Download evidence pack
          </Link>
        </p>
      </main>
    </div>
  );
}
