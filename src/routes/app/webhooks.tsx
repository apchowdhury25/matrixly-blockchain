import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { createWebhook, listWebhooks, revokeWebhook } from "@/lib/trust/functions";

export const Route = createFileRoute("/app/webhooks")({ component: WebhooksPage });

function WebhooksPage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof listWebhooks>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("Bank verify hook");
  const [url, setUrl] = useState("https://");
  const [secret, setSecret] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    listWebhooks()
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
      const created = await createWebhook({ data: { name, url } });
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
      <p className="font-mono text-xs tracking-[0.18em] text-stone uppercase">Events</p>
      <h1 className="mt-2 font-display text-4xl">Webhooks</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">
        Verification results are POSTed with an HMAC-SHA256 header{" "}
        <span className="font-mono text-sm">matrixly-signature</span>. Unsigned events are refused.
        The signing secret is shown once and sealed at rest. Payloads are hashes and flags — no
        holder names.
      </p>
      <form className="mt-8 grid gap-3 sm:grid-cols-[1fr_1fr_auto]" onSubmit={onCreate}>
        <label className="block text-sm font-medium">
          Name
          <input
            className="mt-1 h-11 w-full rounded-sm border border-rule bg-paper-raised px-3"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm font-medium">
          HTTPS URL
          <input
            className="mt-1 h-11 w-full rounded-sm border border-rule bg-paper-raised px-3"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
        </label>
        <div className="flex items-end">
          <Button type="submit" disabled={busy}>
            {busy ? "Creating…" : "Create endpoint"}
          </Button>
        </div>
      </form>
      {error ? <p className="mt-4 text-invalid">{error}</p> : null}
      {secret ? (
        <div className="mt-6 rounded-xl border border-pine/30 bg-pine/8 p-5">
          <p className="text-sm font-medium">Copy this signing secret now. It cannot be retrieved again.</p>
          <p className="mt-2 break-all font-mono text-xs">{secret}</p>
        </div>
      ) : null}

      <h2 className="mt-10 font-display text-2xl">Endpoints</h2>
      <div className="mt-4 overflow-x-auto rounded-xl border border-rule bg-paper-raised">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-rule text-stone">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">URL</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {(data?.endpoints ?? []).length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-stone" colSpan={4}>
                  No webhook endpoints yet.
                </td>
              </tr>
            ) : (
              (data?.endpoints ?? []).map((e) => (
                <tr key={e.id} className="border-b border-rule/70 last:border-0">
                  <td className="px-4 py-3">{e.name}</td>
                  <td className="max-w-[280px] truncate px-4 py-3 font-mono text-xs">{e.url}</td>
                  <td className="px-4 py-3 font-mono text-xs">{e.status}</td>
                  <td className="px-4 py-3 text-right">
                    {e.status === "ACTIVE" ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={async () => {
                          await revokeWebhook({ data: { id: e.id } });
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

      <h2 className="mt-10 font-display text-2xl">Recent deliveries</h2>
      <div className="mt-4 overflow-x-auto rounded-xl border border-rule bg-paper-raised">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-rule text-stone">
            <tr>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">HTTP</th>
              <th className="px-4 py-3 font-medium">Payload hash</th>
            </tr>
          </thead>
          <tbody>
            {(data?.deliveries ?? []).length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-stone" colSpan={4}>
                  No deliveries yet. Verify a diploma after creating an endpoint.
                </td>
              </tr>
            ) : (
              (data?.deliveries ?? []).map((d) => (
                <tr key={d.id} className="border-b border-rule/70 last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">{d.created_at}</td>
                  <td className="px-4 py-3 font-mono text-xs">{d.status}</td>
                  <td className="px-4 py-3 font-mono text-xs">{d.http_status ?? "—"}</td>
                  <td className="max-w-[240px] truncate px-4 py-3 font-mono text-xs">{d.payload_hash}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
