import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { createPresentation, getHolderWallet } from "@/lib/trust/functions";

export const Route = createFileRoute("/wallet/")({ component: WalletPage });

function WalletPage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getHolderWallet>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    getHolderWallet()
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function present(walletItemId: string) {
    setError(null);
    try {
      const res = await createPresentation({ data: { walletItemId } });
      setNotice(`/present/${res.ref}`);
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div>
      <p className="font-mono text-xs tracking-[0.18em] text-stone uppercase">Holder</p>
      <h1 className="mt-2 font-display text-4xl">Wallet</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">
        Claimed credentials live here. A presentation is a W3C VP 2.0 signed by your{" "}
        <span className="font-mono text-sm">did:key</span>. The inner credential still verifies on its
        own.
      </p>
      {data ? (
        <p className="mt-4 break-all font-mono text-xs text-stone">Holder {data.holder.did}</p>
      ) : null}
      {error ? <p className="mt-4 text-invalid">{error}</p> : null}
      {notice ? (
        <p className="mt-4 text-sm">
          Presentation created.{" "}
          <Link to="/present/$ref" params={{ ref: notice.replace("/present/", "") }} className="underline">
            Open public presentation
          </Link>
        </p>
      ) : null}

      <div className="mt-8 overflow-x-auto rounded-xl border border-rule bg-paper-raised">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-rule text-stone">
            <tr>
              <th className="px-4 py-3 font-medium">Credential</th>
              <th className="px-4 py-3 font-medium">Issuer DID</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {!data || data.items.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-stone" colSpan={3}>
                  No credentials in this wallet. Open a claim link from an issuer.
                </td>
              </tr>
            ) : (
              data.items.map((item) => (
                <tr key={item.id} className="border-b border-rule/70 last:border-0">
                  <td className="px-4 py-3">
                    <p>{item.degree_name}</p>
                    <p className="text-xs text-stone">{item.holder_name}</p>
                  </td>
                  <td className="max-w-[240px] truncate px-4 py-3 font-mono text-xs" title={item.issuer_did}>
                    {item.issuer_did}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" onClick={() => present(item.id)}>
                      Present
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data && data.presentations.length > 0 ? (
        <div className="mt-10">
          <h2 className="font-display text-2xl">Presentations</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {data.presentations.map((p) => (
              <li key={p.id}>
                <Link to="/present/$ref" params={{ ref: p.opaque_ref }} className="font-mono text-xs underline">
                  /present/{p.opaque_ref}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
