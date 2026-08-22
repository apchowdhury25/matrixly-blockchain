import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { PublicHeader } from "@/components/layout/public-header";
import { Button } from "@/components/ui/button";
import { Qr } from "@/components/verify/qr";
import { ResultCard, type VerifyView } from "@/components/verify/result-card";
import { getOid4vpRequest, simulateOid4vpWallet } from "@/lib/trust/functions";

export const Route = createFileRoute("/oid4vp/$id")({
  loader: async ({ params }) => getOid4vpRequest({ data: { id: params.id } }),
  component: Oid4vpRequestPage,
});

function Oid4vpRequestPage() {
  const initial = Route.useLoaderData();
  const { id } = Route.useParams();
  const [data, setData] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    getOid4vpRequest({ data: { id } })
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, [id]);

  useEffect(() => {
    if (data.status !== "OPEN") return;
    const t = window.setInterval(refresh, 4000);
    return () => window.clearInterval(t);
  }, [data.status, refresh]);

  async function simulate() {
    setBusy(true);
    setError(null);
    try {
      const next = await simulateOid4vpWallet({ data: { id } });
      setData(next);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const result = data.result as VerifyView | null | undefined;
  const requestUri = data.request.response_uri.replace("/direct-post/", "/request/");

  return (
    <div className="min-h-screen bg-paper">
      <PublicHeader />
      <main className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <p className="font-mono text-xs tracking-[0.22em] text-pine uppercase">OpenID4VP request</p>
        <h1 className="mt-3 font-display text-4xl">Wallet presentation</h1>
        <p className="mt-3 text-ink-soft">
          Status <span className="font-mono text-sm">{data.status}</span>. Nonce is single-use. DCQL
          asks for a W3C <span className="font-mono text-sm">ldp_vc</span> university degree.
        </p>
        {error ? <p className="mt-4 text-invalid">{error}</p> : null}

        <div className="mt-8 grid gap-6 md:grid-cols-[1fr_240px]">
          <div className="space-y-4 rounded-xl border border-rule bg-paper-raised p-5">
            <p className="font-mono text-[11px] tracking-[0.16em] text-stone uppercase">Authorization request</p>
            <p className="break-all font-mono text-xs">{data.walletUri}</p>
            <p className="mt-3 text-sm text-stone">request_uri</p>
            <p className="break-all font-mono text-xs">{requestUri}</p>
            <p className="mt-3 text-sm text-stone">nonce (bound in proof.challenge)</p>
            <p className="break-all font-mono text-xs">{data.request.nonce}</p>
            {data.status === "OPEN" ? (
              <div className="pt-2">
                <Button type="button" disabled={busy} onClick={simulate}>
                  {busy ? "Presenting…" : "This preview wallet"}
                </Button>
                <p className="mt-2 text-sm text-stone">
                  Signs the demo diploma as a W3C VP with this nonce. Not an EUDI wallet.
                </p>
              </div>
            ) : null}
          </div>
          <aside className="h-fit rounded-xl border border-rule bg-paper-raised p-5">
            <p className="font-mono text-[11px] tracking-[0.16em] text-stone uppercase">Wallet QR</p>
            <div className="mt-3 flex justify-center">
              <Qr value={data.walletUri} />
            </div>
          </aside>
        </div>

        {result ? (
          <div className="mt-8">
            <ResultCard result={result} />
          </div>
        ) : null}
      </main>
    </div>
  );
}
