import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicHeader } from "@/components/layout/public-header";
import { UNIVERSITY_DEGREE_SCHEMA, UNIVERSITY_DEGREE_SCHEMA_ID } from "@/lib/schema/university-degree";
import { getPublishedSchemaMeta } from "@/lib/trust/functions";

export const Route = createFileRoute("/schemas/university-degree")({
  loader: () => getPublishedSchemaMeta(),
  component: SchemaPage,
});

function SchemaPage() {
  const meta = Route.useLoaderData();
  return (
    <div className="min-h-screen bg-paper">
      <PublicHeader />
      <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <p className="font-mono text-xs tracking-[0.22em] text-pine uppercase">W3C credentialSchema</p>
        <h1 className="mt-3 font-display text-4xl">University degree schema</h1>
        <p className="mt-4 max-w-2xl text-ink-soft">
          New diplomas include{" "}
          <span className="font-mono text-sm">credentialSchema.type = JsonSchema</span>. The verifier
          checks claims against this document <em>and</em> that its SHA-256 is on the ledger. Unknown
          schema ids fail closed. This is not a full JSON Schema 2020-12 processor.
        </p>
        <p className="mt-4 break-all font-mono text-xs text-stone">{UNIVERSITY_DEGREE_SCHEMA_ID}</p>
        <p className="mt-2 break-all font-mono text-xs text-stone">{meta.schemaHash}</p>
        <p className={`mt-2 text-sm ${meta.ledgerAnchored ? "text-valid" : "text-invalid"}`}>
          {meta.ledgerAnchored ? "Anchored on the ledger" : "Not anchored — verification will fail closed"}
        </p>
        <p className="mt-3 text-sm">
          <a href="/schemas/university-degree-credential.json" className="underline underline-offset-4">
            Machine-readable schema
          </a>
          {" · "}
          <Link to="/status/$id" params={{ id: "demo" }} className="underline underline-offset-4">
            Demo status list
          </Link>
        </p>
        <pre className="mt-8 overflow-x-auto rounded-xl border border-rule bg-paper-raised p-4 font-mono text-xs leading-relaxed">
          {JSON.stringify(UNIVERSITY_DEGREE_SCHEMA, null, 2)}
        </pre>
      </main>
    </div>
  );
}