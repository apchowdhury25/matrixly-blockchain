import { createFileRoute } from "@tanstack/react-router";
import { PublicHeader } from "@/components/layout/public-header";
import { getPublicStatusList } from "@/lib/trust/functions";

export const Route = createFileRoute("/status/$id")({
  loader: async ({ params }) => getPublicStatusList({ data: { id: params.id } }),
  component: StatusPage,
});

function StatusPage() {
  const data = Route.useLoaderData();
  const credential = data.credentialJson
    ? (JSON.parse(data.credentialJson) as {
        proof?: { type?: string; cryptosuite?: string };
        issuer?: { id?: string; name?: string };
      })
    : null;
  const proof = credential?.proof;
  const issuer = credential?.issuer;
  return (
    <div className="min-h-screen bg-paper">
      <PublicHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <p className="font-mono text-xs tracking-[0.18em] text-pine uppercase">Bitstring Status List</p>
        <h1 className="mt-2 font-display text-4xl">Status list credential</h1>
        <p className="mt-2 text-ink-soft">
          Revocation bits are not a database flag. This document is a W3C BitstringStatusListCredential
          signed by the issuer. Verifiers check the proof, then the bit.
        </p>
        <dl className="mt-8 space-y-4 rounded-xl border border-rule bg-paper-raised px-5 py-5 text-sm">
          <div>
            <dt className="text-stone">List id</dt>
            <dd className="break-all font-mono text-xs">{data.id}</dd>
          </div>
          <div>
            <dt className="text-stone">Signed</dt>
            <dd>{data.signed ? "Yes — Data Integrity proof present" : "No"}</dd>
          </div>
          <div>
            <dt className="text-stone">Issuer</dt>
            <dd className="break-all font-mono text-xs">{issuer?.id ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-stone">Proof</dt>
            <dd className="font-mono text-xs">
              {proof?.cryptosuite ?? "—"} {proof?.type ? `· ${proof.type}` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-stone">Credential hash</dt>
            <dd className="break-all font-mono text-xs">{data.credentialHash ?? "—"}</dd>
          </div>
        </dl>
      </main>
    </div>
  );
}
