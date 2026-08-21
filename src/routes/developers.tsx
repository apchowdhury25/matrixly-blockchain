import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicHeader } from "@/components/layout/public-header";
import { DEMO_API_KEY, examples } from "@/lib/api/examples";

export const Route = createFileRoute("/developers")({ component: DevelopersPage });

function Example({
  title,
  status,
  request,
  curl,
  response,
}: {
  title: string;
  status: string;
  request: string;
  curl: string;
  response: string;
}) {
  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-2xl">{title}</h2>
        <p className="font-mono text-xs tracking-[0.14em] text-stone uppercase">HTTP {status}</p>
      </div>
      <p className="mt-3 font-mono text-[11px] tracking-[0.16em] text-stone uppercase">Request</p>
      <pre className="mt-2 overflow-x-auto rounded-xl border border-rule bg-paper-raised p-4 font-mono text-xs leading-relaxed">
        {request}
      </pre>
      <p className="mt-3 font-mono text-[11px] tracking-[0.16em] text-stone uppercase">curl</p>
      <pre className="mt-2 overflow-x-auto rounded-xl border border-rule bg-paper-raised p-4 font-mono text-xs leading-relaxed">
        {curl}
      </pre>
      <p className="mt-3 font-mono text-[11px] tracking-[0.16em] text-stone uppercase">Response</p>
      <pre className="mt-2 overflow-x-auto rounded-xl border border-rule bg-paper-raised p-4 font-mono text-xs leading-relaxed">
        {response}
      </pre>
    </section>
  );
}

function DevelopersPage() {
  const list = [
    examples.missingKey,
    examples.validRef,
    examples.revokedRef,
    examples.expiredRef,
    examples.includeSubject,
    examples.tamper,
    examples.postedCredential,
    examples.presentation,
    examples.report,
    examples.openapi,
  ];
  return (
    <div className="min-h-screen bg-paper">
      <PublicHeader />
      <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <p className="font-mono text-xs tracking-[0.22em] text-pine uppercase">Verifier API</p>
        <h1 className="mt-3 font-display text-4xl">Machine verification</h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-soft">
          Banks, employers, and registries verify a credential by posting it to the API. The response
          is cryptographic evidence: issuer DID, Ed25519, SHA-256, signed status list, ledger anchor,
          and a signed report. A missing API key is{" "}
          <span className="font-mono text-sm">401</span> — never{" "}
          <span className="font-mono text-sm">VALID</span>.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-ink-soft">
          Replace <span className="font-mono">$BASE</span> with this site’s origin. This preview
          accepts the demonstration key{" "}
          <span className="font-mono text-xs">{DEMO_API_KEY}</span>
          — hashed at rest, not a bypass. Mint your own under{" "}
          <Link to="/app/api-keys" className="underline underline-offset-4">
            API keys
          </Link>
          . Spec:{" "}
          <a href="/api/v1/openapi.json" className="underline underline-offset-4">
            /api/v1/openapi.json
          </a>
          .
        </p>
        <div className="mt-8 overflow-x-auto rounded-xl border border-rule bg-paper-raised">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="border-b border-rule text-stone">
              <tr>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Path</th>
                <th className="px-4 py-3 font-medium">Auth</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-rule/70">
                <td className="px-4 py-3 font-mono text-xs">POST</td>
                <td className="px-4 py-3 font-mono text-xs">/api/v1/verify</td>
                <td className="px-4 py-3">Bearer required</td>
              </tr>
              <tr className="border-b border-rule/70">
                <td className="px-4 py-3 font-mono text-xs">GET</td>
                <td className="px-4 py-3 font-mono text-xs">/api/v1/reports/{"{ref}"}</td>
                <td className="px-4 py-3">Bearer required</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-mono text-xs">GET</td>
                <td className="px-4 py-3 font-mono text-xs">/api/v1/openapi.json</td>
                <td className="px-4 py-3">Public</td>
              </tr>
            </tbody>
          </table>
        </div>
        {list.map((ex) => (
          <Example key={ex.title} {...ex} />
        ))}
      </article>
    </div>
  );
}
