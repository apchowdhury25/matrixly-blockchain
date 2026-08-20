import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PublicHeader } from "@/components/layout/public-header";
import { Button } from "@/components/ui/button";
import { ResultCard, type VerifyView } from "@/components/verify/result-card";
import { verifyOpaqueRef, verifyUploaded } from "@/lib/trust/functions";

export const Route = createFileRoute("/verify/")({ component: VerifyPage });

function fileToB64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = () => {
      const s = String(reader.result ?? "");
      resolve(s.includes(",") ? s.slice(s.indexOf(",") + 1) : s);
    };
    reader.readAsDataURL(file);
  });
}

function VerifyPage() {
  const navigate = useNavigate();
  const [ref, setRef] = useState("");
  const [json, setJson] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<VerifyView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onRef(e: React.FormEvent) {
    e.preventDefault();
    const value = ref.trim().replace(/^.*\/verify\//, "");
    if (!value) return;
    navigate({ to: "/verify/$ref", params: { ref: value } });
  }

  async function onUpload(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const documentB64 = file ? await fileToB64(file) : undefined;
      if (json.trim()) {
        const r = await verifyUploaded({ data: { credentialJson: json, documentB64 } });
        setResult(r);
      } else if (ref.trim()) {
        const value = ref.trim().replace(/^.*\/verify\//, "");
        const r = await verifyOpaqueRef({ data: { ref: value, mode: documentB64 ? "none" : "bound", uploadB64: documentB64 } });
        setResult(r);
      } else {
        throw new Error("Provide a credential JSON or verification ID.");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      <PublicHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <p className="font-mono text-xs tracking-[0.22em] text-pine uppercase">Public verifier</p>
        <h1 className="mt-3 font-display text-4xl">Check a document</h1>
        <p className="mt-3 text-ink-soft">
          No account required. Paste a verification ID, scan a QR destination, or upload a credential
          plus the original PDF. Each cryptographic check is evaluated independently.
        </p>

        <form className="mt-8 space-y-3 rounded-xl border border-rule bg-paper-raised p-6" onSubmit={onRef}>
          <label className="text-sm font-medium">Verification ID or URL</label>
          <input
            className="h-11 w-full rounded-sm border border-rule bg-paper px-3 font-mono text-sm"
            placeholder="demo-valid-bcs"
            value={ref}
            onChange={(e) => setRef(e.target.value)}
          />
          <Button type="submit">Open verification</Button>
        </form>

        <form className="mt-6 space-y-3 rounded-xl border border-rule bg-paper-raised p-6" onSubmit={onUpload}>
          <label className="text-sm font-medium">Or paste a Verifiable Credential</label>
          <textarea
            className="min-h-36 w-full rounded-sm border border-rule bg-paper p-3 font-mono text-xs"
            placeholder='{"@context":["https://www.w3.org/ns/credentials/v2"], ...}'
            value={json}
            onChange={(e) => setJson(e.target.value)}
          />
          <label className="block text-sm font-medium">Optional original PDF</label>
          <input
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {error ? <p className="text-sm text-invalid">{error}</p> : null}
          <Button type="submit" variant="secondary" disabled={busy}>
            {busy ? "Verifying…" : "Verify credential"}
          </Button>
        </form>

        {result ? (
          <div className="mt-8">
            <ResultCard result={result} />
          </div>
        ) : null}
      </main>
    </div>
  );
}
