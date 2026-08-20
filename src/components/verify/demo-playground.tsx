import { useEffect, useRef, useState } from "react";
import { getDemoCatalog, verifyOpaqueRef } from "@/lib/trust/functions";
import { Button } from "@/components/ui/button";
import { ResultCard, type VerifyView } from "./result-card";
import { Qr } from "./qr";

type Mode = "bound" | "tampered";
type Catalog = Awaited<ReturnType<typeof getDemoCatalog>>;

export function DemoPlayground({
  initialCatalog,
  initialResult,
}: {
  initialCatalog?: Catalog;
  initialResult?: VerifyView;
}) {
  const [catalog, setCatalog] = useState<Catalog | null>(initialCatalog ?? null);
  const [active, setActive] = useState<{ ref: string; mode: Mode }>({
    ref: initialCatalog?.valid ?? "demo-valid-bcs",
    mode: "bound",
  });
  const [result, setResult] = useState<VerifyView | null>(initialResult ?? null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const verifyPath = `/verify/${active.ref}`;
  const [verifyUrl, setVerifyUrl] = useState(verifyPath);

  const skipFirstFetch = useRef(Boolean(initialResult));

  useEffect(() => {
    setVerifyUrl(`${window.location.origin}${verifyPath}`);
  }, [verifyPath]);

  useEffect(() => {
    if (catalog) return;
    getDemoCatalog()
      .then(setCatalog)
      .catch((err: Error) => setError(err.message));
  }, [catalog]);

  useEffect(() => {
    if (!catalog) return;
    if (skipFirstFetch.current) {
      skipFirstFetch.current = false;
      return;
    }
    let alive = true;
    setPending(true);
    setResult(null);
    verifyOpaqueRef({ data: { ref: active.ref, mode: active.mode } })
      .then((r) => {
        if (alive) setResult(r);
      })
      .catch((err: Error) => {
        if (alive) setError(err.message);
      })
      .finally(() => {
        if (alive) setPending(false);
      });
    return () => {
      alive = false;
    };
  }, [catalog, active]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div>
        <div className="mb-4 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={active.ref === catalog?.valid && active.mode === "bound" ? "primary" : "secondary"}
            onClick={() => setActive({ ref: catalog?.valid ?? "demo-valid-bcs", mode: "bound" })}
          >
            Original PDF
          </Button>
          <Button
            size="sm"
            variant={active.mode === "tampered" ? "primary" : "secondary"}
            onClick={() => setActive({ ref: catalog?.valid ?? "demo-valid-bcs", mode: "tampered" })}
          >
            One-byte tamper
          </Button>
          <Button
            size="sm"
            variant={active.ref === catalog?.revoked ? "primary" : "secondary"}
            onClick={() => setActive({ ref: catalog?.revoked ?? "demo-revoked-bcs", mode: "bound" })}
          >
            Revoked
          </Button>
          <Button
            size="sm"
            variant={active.ref === catalog?.expired ? "primary" : "secondary"}
            onClick={() => setActive({ ref: catalog?.expired ?? "demo-expired-bcs", mode: "bound" })}
          >
            Expired
          </Button>
        </div>
        {error ? <p className="text-sm text-invalid">{error}</p> : null}
        {pending && !result ? (
          <div className="h-80 animate-pulse rounded-xl bg-rule/40" />
        ) : result ? (
          <ResultCard result={result} />
        ) : null}
      </div>
      <aside className="h-fit rounded-xl border border-rule bg-paper-raised p-5 shadow-quiet">
        <p className="font-mono text-[11px] tracking-[0.18em] text-stone uppercase">Live QR</p>
        <p className="mt-1 text-sm text-ink-soft">Opaque verification link. No PII is encoded in the code.</p>
        <div className="mt-4 flex justify-center">
          <Qr value={verifyUrl || "https://matrixly.ai/verify/demo-valid-bcs"} />
        </div>
        <p className="mt-3 break-all font-mono text-[11px] text-stone">{verifyUrl}</p>
      </aside>
    </div>
  );
}
