import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { claimCredential, getClaimOffer } from "@/lib/trust/functions";

export const Route = createFileRoute("/wallet/claim/$token")({ component: ClaimPage });

function ClaimPage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const [offer, setOffer] = useState<Awaited<ReturnType<typeof getClaimOffer>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getClaimOffer({ data: { token } })
      .then(setOffer)
      .catch((err: Error) => setError(err.message));
  }, [token]);

  async function onClaim() {
    setBusy(true);
    setError(null);
    try {
      await claimCredential({ data: { token } });
      navigate({ to: "/wallet" });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-xl">
      <p className="font-mono text-xs tracking-[0.18em] text-stone uppercase">Delivery</p>
      <h1 className="mt-2 font-display text-4xl">Claim credential</h1>
      <p className="mt-2 text-ink-soft">
        The issuer signed this credential. Claiming copies it into your wallet. It does not change the
        signature.
      </p>
      {offer ? (
        <div className="mt-6 rounded-xl border border-rule bg-paper-raised px-5 py-4">
          <p className="font-display text-2xl">{offer.degree_name}</p>
          <p className="mt-1 text-sm text-ink-soft">Issued to {offer.holder_name}</p>
          <p className="mt-3 font-mono text-xs break-all text-stone">{offer.issuer_did}</p>
          <p className="mt-2 font-mono text-xs text-stone">Status {offer.status}</p>
        </div>
      ) : null}
      {error ? <p className="mt-4 text-invalid">{error}</p> : null}
      <Button className="mt-6" disabled={busy || !offer} onClick={onClaim}>
        {busy ? "Claiming…" : offer?.status === "CLAIMED" ? "Open in wallet" : "Claim into wallet"}
      </Button>
    </div>
  );
}
