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
    examples.unknownRef,
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
          . Response bodies below are complete JSON from a live call. Issuer DID, hashes, and{" "}
          <span className="font-mono">reportRef</span> change if the demo tenant is re-seeded;
          field names and check flags do not.
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
              <tr className="border-b border-rule/70">
                <td className="px-4 py-3 font-mono text-xs">GET</td>
                <td className="px-4 py-3 font-mono text-xs">/api/v1/evidence/{"{ref}"}</td>
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

        <h2 className="mt-14 font-display text-2xl">Webhooks</h2>
        <p className="mt-3 leading-relaxed text-ink-soft">
          After a verification, Matrixly POSTs a JSON event to each active HTTPS endpoint. The body
          is hashes and flags only. Header{" "}
          <span className="font-mono text-sm">{"matrixly-signature: t=<iso>,v1=<hmac-sha256>"}</span>{" "}
          is required; unsigned events are refused. Signing secrets are{" "}
          <span className="font-mono text-sm">mtx_whsec_…</span>, shown once, sealed at rest. Loopback
          and link-local URLs are rejected.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-xl border border-rule bg-paper-raised p-4 font-mono text-xs leading-relaxed">
          {`POST https://hooks.bank.example/matrixly
Content-Type: application/json
matrixly-signature: t=2026-08-21T18:00:00.000Z,v1=<hex>
matrixly-event-id: wh_…

{
  "id": "wh_…",
  "type": "verification.completed",
  "source": "api",
  "status": "VALID",
  "verified": true,
  "issuerDid": "did:key:z6Mk…",
  "credentialId": "urn:uuid:demo-valid-bcs",
  "credentialHash": "sha256:…",
  "documentHash": "sha256:…",
  "reportRef": "…",
  "reportHash": "sha256:…",
  "checks": {
    "issuerRegistered": true,
    "signatureValid": true,
    "documentSha256": true,
    "ledgerProof": true,
    "signedStatusList": true,
    "credentialActive": true
  },
  "reasons": []
}`}
        </pre>

        <h2 className="mt-10 font-display text-2xl">Evidence pack</h2>
        <p className="mt-3 leading-relaxed text-ink-soft">
          <span className="font-mono text-sm">GET /api/v1/evidence/{"{ref}"}</span> and{" "}
          <span className="font-mono text-sm">/evidence/{"{ref}"}</span> return hashes, the signed
          verification report, and ledger flags. No PDF bytes. No holder name. Control matrix:{" "}
          <Link to="/compliance" className="underline underline-offset-4">
            /compliance
          </Link>
          . That page is an engineering list, not a certification.
        </p>

        <h2 className="mt-10 font-display text-2xl">did:web</h2>
        <p className="mt-3 leading-relaxed text-ink-soft">
          Issuers publish a DID document at{" "}
          <a href="/did-web/global-university" className="underline underline-offset-4">
            /did-web/global-university
          </a>{" "}
          (
          <a href="/api/v1/did-web/global-university" className="underline underline-offset-4">
            application/did+json
          </a>
          ). The identifier is{" "}
          <span className="font-mono text-xs">did:web:matrixly.example.test:issuers:global-university</span>
          . Fetch is HTTPS only; loopback and link-local hosts fail closed.{" "}
          <span className="font-mono text-sm">did:ion</span> and unknown methods still return a
          resolution error — never VALID. Verify{" "}
          <span className="font-mono text-sm">demo-valid-didweb</span> to see a credential whose
          issuer is the hosted DID.
        </p>
      </article>
    </div>
  );
}
