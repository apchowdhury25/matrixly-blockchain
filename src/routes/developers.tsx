import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicHeader } from "@/components/layout/public-header";

export const Route = createFileRoute("/developers")({ component: DevelopersPage });

function DevelopersPage() {
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

        <h2 className="mt-10 font-display text-2xl">Authenticate</h2>
        <p className="mt-3 leading-relaxed text-ink-soft">
          Sign in, open <span className="font-medium text-ink">API keys</span> in the issuer console,
          and create a key. The secret is shown once. It is stored as SHA-256, never in plaintext.
          This preview also seeds a demonstration key{" "}
          <span className="font-mono text-sm">mtx_live_demo_verifier_qa_only</span> — same hashing
          rules, not a bypass.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-xl border border-rule bg-paper-raised p-4 font-mono text-xs leading-relaxed">
          {`Authorization: Bearer mtx_live_…`}
        </pre>

        <h2 className="mt-10 font-display text-2xl">Verify by opaque link</h2>
        <pre className="mt-4 overflow-x-auto rounded-xl border border-rule bg-paper-raised p-4 font-mono text-xs leading-relaxed">
          {`POST /api/v1/verify
Content-Type: application/json

{ "ref": "demo-valid-bcs" }`}
        </pre>
        <p className="mt-3 text-sm text-ink-soft">
          Default response has no holder name. Pass{" "}
          <span className="font-mono">includeSubject: true</span> only if the verifier is allowed to
          see display names.
        </p>

        <h2 className="mt-10 font-display text-2xl">Verify a posted credential</h2>
        <pre className="mt-4 overflow-x-auto rounded-xl border border-rule bg-paper-raised p-4 font-mono text-xs leading-relaxed">
          {`POST /api/v1/verify

{ "credential": { "@context": …, "type": ["VerifiableCredential"], "proof": … } }`}
        </pre>

        <h2 className="mt-10 font-display text-2xl">OpenAPI</h2>
        <p className="mt-3 leading-relaxed text-ink-soft">
          Machine-readable spec at{" "}
          <a href="/api/v1/openapi.json" className="underline underline-offset-4">
            /api/v1/openapi.json
          </a>
          . Signed reports: <span className="font-mono text-sm">GET /api/v1/reports/{"{ref}"}</span>.
        </p>
        <p className="mt-8">
          <Link to="/app/api-keys" className="text-sm underline underline-offset-4">
            Issue an API key
          </Link>
        </p>
      </article>
    </div>
  );
}
