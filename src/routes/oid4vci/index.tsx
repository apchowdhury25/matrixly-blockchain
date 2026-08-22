import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PublicHeader } from "@/components/layout/public-header";
import { Button } from "@/components/ui/button";
import { Qr } from "@/components/verify/qr";
import { DEMO } from "@/lib/trust/ids";

type OfferPayload = {
  offer: {
    credential_issuer: string;
    credential_configuration_ids: string[];
    grants: Record<string, { "pre-authorized_code"?: string }>;
  };
  credential_offer_uri: string;
};

type PreviewResult = {
  status?: string;
  note?: string;
  credentialId?: string;
  issuerDid?: string;
  type?: unknown;
  format?: string;
  error?: string;
};

export const Route = createFileRoute("/oid4vci/")({ component: Oid4vciPage });

function Oid4vciPage() {
  const [offer, setOffer] = useState<OfferPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);

  useEffect(() => {
    fetch(`/api/v1/oid4vci/offer/${DEMO.claimToken}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Could not load credential offer");
        setOffer((await res.json()) as OfferPayload);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  async function simulate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/oid4vci/preview-wallet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pre_authorized_code: DEMO.claimToken }),
      });
      const body = (await res.json()) as PreviewResult;
      if (!res.ok) throw new Error(body.error ?? "Preview wallet failed");
      setPreview(body);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const code =
    offer?.offer.grants["urn:ietf:params:oauth:grant-type:pre-authorized_code"]?.["pre-authorized_code"] ??
    DEMO.claimToken;

  return (
    <div className="min-h-screen bg-paper">
      <PublicHeader />
      <main className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <p className="font-mono text-xs tracking-[0.22em] text-pine uppercase">OpenID4VCI 1.0</p>
        <h1 className="mt-3 font-display text-4xl">Pull a diploma into a wallet</h1>
        <p className="mt-4 max-w-2xl text-ink-soft">
          Pre-authorized code flow. The issuer already signed the W3C credential; the wallet fetches it.
          Delivery does not re-sign. SD-JWT and mdoc are refused. This is not HAIP certification.
        </p>
        {error ? <p className="mt-4 text-invalid">{error}</p> : null}

        <div className="mt-8 grid gap-6 md:grid-cols-[1fr_240px]">
          <div className="space-y-3 rounded-xl border border-rule bg-paper-raised p-5">
            <p className="font-mono text-[11px] tracking-[0.16em] text-stone uppercase">Credential offer</p>
            <p className="text-sm text-stone">pre-authorized_code</p>
            <p className="break-all font-mono text-xs">{code}</p>
            <p className="mt-3 text-sm text-stone">configuration</p>
            <p className="font-mono text-xs">{offer?.offer.credential_configuration_ids[0]}</p>
            <p className="mt-3 text-sm text-stone">Metadata</p>
            <p className="font-mono text-xs">
              <a href="/.well-known/openid-credential-issuer" className="underline underline-offset-4">
                /.well-known/openid-credential-issuer
              </a>
            </p>
            <div className="pt-3">
              <Button type="button" disabled={busy} onClick={simulate}>
                {busy ? "Fetching…" : "This preview wallet"}
              </Button>
              <p className="mt-2 text-sm text-stone">
                Token endpoint then credential endpoint. Not an EUDI wallet.{" "}
                <Link to="/wallet/claim/$token" params={{ token: DEMO.claimToken }} className="underline">
                  Or claim into the Matrixly wallet
                </Link>
                .
              </p>
            </div>
          </div>
          <aside className="h-fit rounded-xl border border-rule bg-paper-raised p-5">
            <p className="font-mono text-[11px] tracking-[0.16em] text-stone uppercase">Offer QR</p>
            <div className="mt-3 flex justify-center">
              <Qr value={offer?.credential_offer_uri ?? "openid-credential-offer://"} />
            </div>
          </aside>
        </div>

        {preview ? (
          <div className="mt-8 rounded-xl border border-valid/30 bg-valid/8 p-5">
            <p className="font-mono text-xs tracking-[0.16em] text-valid uppercase">{preview.status}</p>
            <p className="mt-2 text-sm">{preview.note}</p>
            <p className="mt-4 break-all font-mono text-xs">{preview.credentialId}</p>
            <p className="mt-2 break-all font-mono text-xs">{preview.issuerDid}</p>
            <p className="mt-2 font-mono text-xs">{JSON.stringify(preview.type)}</p>
          </div>
        ) : null}
      </main>
    </div>
  );
}
