import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PublicHeader } from "@/components/layout/public-header";
import { ResultCard, type VerifyView } from "@/components/verify/result-card";
import { Qr } from "@/components/verify/qr";
import { verifyPresentationRef } from "@/lib/trust/functions";

export const Route = createFileRoute("/present/$ref")({ component: PresentRef });

function PresentRef() {
  const { ref } = Route.useParams();
  const [result, setResult] = useState<VerifyView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState(`/present/${ref}`);

  useEffect(() => {
    setShareUrl(window.location.href);
  }, [ref]);

  useEffect(() => {
    let alive = true;
    verifyPresentationRef({ data: { ref, mode: "bound" } })
      .then((r) => {
        if (alive) setResult(r as VerifyView);
      })
      .catch((err: Error) => {
        if (alive) setError(err.message);
      });
    return () => {
      alive = false;
    };
  }, [ref]);

  return (
    <div className="min-h-screen bg-paper">
      <PublicHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <p className="font-mono text-xs tracking-[0.18em] text-pine uppercase">Verifiable presentation</p>
        <h1 className="mt-2 font-display text-4xl">Holder presentation</h1>
        <p className="mt-2 text-ink-soft">
          Holder proof first, then the inner credential pipeline. A valid envelope around an invalid
          credential is still invalid.
        </p>
        {error ? <p className="mt-6 text-invalid">{error}</p> : null}
        {result ? (
          <div className="mt-8">
            <ResultCard result={result} />
          </div>
        ) : (
          <div className="mt-8 h-48 animate-pulse rounded-xl bg-rule/40" />
        )}
        <div className="mt-8 flex items-center gap-4">
          <Qr value={shareUrl} />
          <p className="font-mono text-xs break-all text-stone">{shareUrl}</p>
        </div>
      </main>
    </div>
  );
}
