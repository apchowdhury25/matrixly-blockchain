import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getIssuerStatusList } from "@/lib/trust/functions";

export const Route = createFileRoute("/app/status")({ component: IssuerStatusPage });

function IssuerStatusPage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getIssuerStatusList>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getIssuerStatusList()
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, []);

  const publicId = data?.id.includes("/") ? data.id.split("/").pop() : data?.id;

  return (
    <div className="max-w-2xl">
      <p className="font-mono text-xs tracking-[0.18em] text-stone uppercase">Revocation</p>
      <h1 className="mt-2 font-display text-4xl">Status list</h1>
      <p className="mt-2 text-ink-soft">
        This issuer publishes a signed Bitstring Status List credential. Revoking a diploma sets a bit
        and re-signs the list. Verifiers do not trust a row that says REVOKED without this proof.
      </p>
      {error ? <p className="mt-4 text-invalid">{error}</p> : null}
      {data ? (
        <dl className="mt-8 space-y-4 rounded-xl border border-rule bg-paper-raised px-5 py-5 text-sm">
          <div>
            <dt className="text-stone">Status list id</dt>
            <dd className="break-all font-mono text-xs">{data.id}</dd>
          </div>
          <div>
            <dt className="text-stone">Signed</dt>
            <dd>{data.signed ? "Yes" : "Missing signature"}</dd>
          </div>
          <div>
            <dt className="text-stone">Next index</dt>
            <dd className="font-mono text-xs">{data.nextIndex}</dd>
          </div>
          <div>
            <dt className="text-stone">Hash</dt>
            <dd className="break-all font-mono text-xs">{data.credentialHash ?? "—"}</dd>
          </div>
          {publicId ? (
            <div>
              <dt className="text-stone">Public document</dt>
              <dd>
                <Link to="/status/$id" params={{ id: publicId }} className="underline">
                  View status list credential
                </Link>
              </dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <div className="mt-8 h-40 animate-pulse rounded-xl bg-rule/40" />
      )}
    </div>
  );
}
