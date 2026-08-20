import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PublicHeader } from "@/components/layout/public-header";
import { ResultCard, type VerifyView } from "@/components/verify/result-card";
import { Qr } from "@/components/verify/qr";
import { getPublicCredential, verifyOpaqueRef } from "@/lib/trust/functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/verify/$ref")({ component: VerifyRef });

function VerifyRef() {
  const { ref } = Route.useParams();
  const [result, setResult] = useState<VerifyView | null>(null);
  const [meta, setMeta] = useState<Awaited<ReturnType<typeof getPublicCredential>>>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"bound" | "tampered" | "none">("bound");

  useEffect(() => {
    let alive = true;
    getPublicCredential({ data: { ref } })
      .then((m) => {
        if (alive) setMeta(m);
      })
      .catch((err: Error) => {
        if (alive) setError(err.message);
      });
    return () => {
      alive = false;
    };
  }, [ref]);

  useEffect(() => {
    let alive = true;
    verifyOpaqueRef({ data: { ref, mode } })
      .then((r) => {
        if (alive) setResult(r);
      })
      .catch((err: Error) => {
        if (alive) setError(err.message);
      });
    return () => {
      alive = false;
    };
  }, [ref, mode]);

  const [shareUrl, setShareUrl] = useState(`/verify/${ref}`);
  useEffect(() => {
    setShareUrl(window.location.href);
  }, [ref]);

  return (
    <div className="min-h-screen bg-paper">
      <PublicHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <p className="font-mono text-xs tracking-[0.22em] text-pine uppercase">Verification report</p>
        <h1 className="mt-3 font-display text-4xl">{meta?.degreeName ?? "Credential"}</h1>
        <p className="mt-2 text-ink-soft">
          {meta ? `${meta.holderName} · ${meta.issuerName}` : "Resolving opaque reference"}
        </p>
        {error ? <p className="mt-4 text-sm text-invalid">{error}</p> : null}
        {ref === "demo-valid-bcs" ? (
          <div className="mt-6 flex flex-wrap gap-2">
            <Button size="sm" variant={mode === "bound" ? "primary" : "secondary"} onClick={() => setMode("bound")}>
              Original PDF
            </Button>
            <Button size="sm" variant={mode === "tampered" ? "primary" : "secondary"} onClick={() => setMode("tampered")}>
              One-byte tamper
            </Button>
            <Button size="sm" variant={mode === "none" ? "primary" : "secondary"} onClick={() => setMode("none")}>
              Credential only
            </Button>
          </div>
        ) : null}
        <div className="mt-8">{result ? <ResultCard result={result} /> : <div className="h-72 animate-pulse rounded-xl bg-rule/40" />}</div>
        <div className="mt-8 flex flex-col items-start gap-4 rounded-xl border border-rule bg-paper-raised p-5 sm:flex-row sm:items-center">
          <Qr value={shareUrl} size={140} />
          <div>
            <p className="text-sm font-medium">Share this verification link</p>
            <p className="mt-1 break-all font-mono text-xs text-stone">{shareUrl}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
