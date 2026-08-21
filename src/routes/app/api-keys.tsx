import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { createApiKey, listApiKeys, revokeApiKey } from "@/lib/trust/functions";

export const Route = createFileRoute("/app/api-keys")({ component: ApiKeysPage });

function ApiKeysPage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof listApiKeys>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("Verifier integration");
  const [secret, setSecret] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    listApiKeys()
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await createApiKey({ data: { name } });
      setSecret(created.secret);
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="font-mono text-xs tracking-[0.18em] text-stone uppercase">Verifier API</p>
      <h1 className="mt-2 font-display text-4xl">API keys</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">
        Keys authenticate machine verification. The secret is shown once and stored as SHA-256.
        Requests without a valid key return 401 — they never return VALID.{" "}
        <Link to="/developers" className="underline underline-offset-4">
          API documentation
        </Link>
      </p>

      <form className="mt-8 flex flex-wrap items-end gap-3" onSubmit={onCreate}>
        <label className="block text-sm font-medium">
          Key name
          <input
            className="mt-1 h-11 w-64 rounded-sm border border-rule bg-paper-raised px-3"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <Button type="submit" disabled={busy}>
          {busy ? "Creating…" : "Create key"}
        </Button>
      </form>

      {error ? <p className="mt-4 text-invalid">{error}</p> : null}
      {secret ? (
        <div className="mt-6 rounded-xl border border-pine/30 bg-pine/8 p-5">
          <p className="text-sm font-medium">Copy this secret now. It cannot be retrieved again.</p>
          <p className="mt-2 break-all font-mono text-xs">{secret}</p>
        </div>
      ) : null}

      <div className="mt-8 overflow-x-auto rounded-xl border border-rule bg-paper-raised">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-rule text-stone">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Prefix</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Last used</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {(data?.keys ?? []).length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-stone" colSpan={5}>
                  No verifier keys in this workspace yet.
                </td>
              </tr>
            ) : (
              (data?.keys ?? []).map((k) => (
                <tr key={k.id} className="border-b border-rule/70 last:border-0">
                  <td className="px-4 py-3">{k.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{k.prefix}…</td>
                  <td className="px-4 py-3 font-mono text-xs">{k.status}</td>
                  <td className="px-4 py-3 font-mono text-xs">{k.last_used_at ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    {k.status === "ACTIVE" ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={async () => {
                          await revokeApiKey({ data: { id: k.id } });
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
