import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PublicHeader } from "@/components/layout/public-header";
import { Button } from "@/components/ui/button";
import { createOid4vpRequest } from "@/lib/trust/functions";

export const Route = createFileRoute("/oid4vp/")({ component: Oid4vpStartPage });

function Oid4vpStartPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onCreate() {
    setBusy(true);
    setError(null);
    try {
      const origin = window.location.origin;
      const created = await createOid4vpRequest({ data: { origin } });
      navigate({ to: "/oid4vp/$id", params: { id: created.id } });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      <PublicHeader />
      <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <p className="font-mono text-xs tracking-[0.22em] text-pine uppercase">OpenID4VP 1.0</p>
        <h1 className="mt-3 font-display text-4xl">Request a presentation</h1>
        <p className="mt-4 max-w-2xl text-ink-soft">
          A wallet posts a <span className="font-mono text-sm">vp_token</span> to this verifier over{" "}
          <span className="font-mono text-sm">direct_post</span>. The nonce is bound in the holder
          proof (<span className="font-mono text-sm">challenge</span>). SD-JWT and mdoc are refused.
          This is not HAIP certification.
        </p>
        {error ? <p className="mt-6 text-invalid">{error}</p> : null}
        <div className="mt-8">
          <Button type="button" disabled={busy} onClick={onCreate}>
            {busy ? "Creating request…" : "Create OpenID4VP request"}
          </Button>
        </div>
      </main>
    </div>
  );
}
