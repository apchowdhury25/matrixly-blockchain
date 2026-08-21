import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getWorkspace } from "@/lib/trust/functions";

export const Route = createFileRoute("/app/")({ component: Overview });

function Overview() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getWorkspace>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getWorkspace()
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) return <p className="text-invalid">{error}</p>;
  if (!data) return <div className="h-48 animate-pulse rounded-xl bg-rule/40" />;

  const cards = [
    { k: "Issued", v: data.stats.issued },
    { k: "Documents", v: data.stats.documents },
    { k: "Revoked", v: data.stats.revoked },
    { k: "Verifications", v: data.stats.verifications },
  ];

  return (
    <div>
      <p className="font-mono text-xs tracking-[0.18em] text-stone uppercase">{data.role}</p>
      <h1 className="mt-2 font-display text-4xl">{data.orgName}</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">
        Issuer DID is provisioned automatically. Issue a diploma, then open the public verifier with
        the opaque QR link.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.k} className="rounded-xl border border-rule bg-paper-raised p-5">
            <p className="text-sm text-stone">{c.k}</p>
            <p className="mt-2 font-display text-4xl tabular-nums">{c.v}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          to="/app/issue"
          search={{ documentId: undefined }}
          className="inline-flex h-11 items-center rounded-sm bg-pine px-5 text-sm font-medium text-pine-fg"
        >
          Issue a credential
        </Link>
        <Link
          to="/app/credentials"
          className="inline-flex h-11 items-center rounded-sm border border-rule px-5 text-sm"
        >
          View credentials
        </Link>
        <Link
          to="/app/api-keys"
          className="inline-flex h-11 items-center rounded-sm border border-rule px-5 text-sm"
        >
          API keys
        </Link>
      </div>
      <div className="mt-10 rounded-xl border border-rule bg-paper-raised p-5">
        <p className="text-sm text-stone">Issuer DID</p>
        <p className="mt-2 break-all font-mono text-xs leading-relaxed">{data.issuerDid}</p>
      </div>
    </div>
  );
}
