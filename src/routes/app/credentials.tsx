import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { listIssuerCredentials, revokeCredential } from "@/lib/trust/functions";

export const Route = createFileRoute("/app/credentials")({ component: CredentialsPage });

function CredentialsPage() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listIssuerCredentials>>>([]);
  const [error, setError] = useState<string | null>(null);

  function load() {
    listIssuerCredentials()
      .then(setRows)
      .catch((err: Error) => setError(err.message));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Credentials</h1>
          <p className="mt-2 text-ink-soft">Tenant-scoped. Other issuers cannot read these rows.</p>
        </div>
        <Link to="/app/issue" search={{ documentId: undefined }} className="inline-flex h-11 items-center rounded-sm bg-pine px-5 text-sm text-pine-fg">
          Issue
        </Link>
      </div>
      {error ? <p className="mt-4 text-invalid">{error}</p> : null}
      <div className="mt-8 overflow-x-auto rounded-xl border border-rule bg-paper-raised">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-rule text-stone">
            <tr>
              <th className="px-4 py-3 font-medium">Holder</th>
              <th className="px-4 py-3 font-medium">Credential</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Verify</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-stone" colSpan={5}>
                  No credentials issued in this workspace yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-rule/70 last:border-0">
                  <td className="px-4 py-3">{r.holder_name}</td>
                  <td className="px-4 py-3">{r.degree_name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.status}</td>
                  <td className="px-4 py-3">
                    <Link to="/verify/$ref" params={{ ref: r.opaque_ref }} className="underline-offset-4 hover:underline">
                      {r.opaque_ref}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.status === "ACTIVE" ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={async () => {
                          await revokeCredential({ data: { id: r.id } });
                          load();
                        }}
                      >
                        Revoke
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
