import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { issueDegree } from "@/lib/trust/functions";

export const Route = createFileRoute("/app/issue")({
  validateSearch: (s: Record<string, unknown>) => ({
    documentId: typeof s.documentId === "string" ? s.documentId : undefined,
  }),
  component: IssuePage,
});

function fileToB64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const s = String(reader.result ?? "");
      const i = s.indexOf(",");
      resolve(i >= 0 ? s.slice(i + 1) : s);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Read failed"));
    reader.readAsDataURL(file);
  });
}

function IssuePage() {
  const navigate = useNavigate();
  const { documentId } = Route.useSearch();
  const [holderName, setHolderName] = useState("Alex Rivera");
  const [degreeName, setDegreeName] = useState("Bachelor of Computer Science");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const uploadB64 = file ? await fileToB64(file) : undefined;
      const res = await issueDegree({
        data: {
          holderName,
          degreeName,
          idempotencyKey: crypto.randomUUID(),
          documentId,
          uploadB64,
          originalName: file?.name,
        },
      });
      navigate({ to: "/verify/$ref", params: { ref: res.ref } });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-4xl">Issue a credential</h1>
      <p className="mt-2 text-ink-soft">
        {documentId
          ? "Binds a W3C VC 2.0 and Ed25519 proof to an already-ingested document hash."
          : "Generate a diploma PDF, or upload a file. The SHA-256 of the exact bytes is bound into the credential and anchored. Replay the same idempotency key and exactly one credential is created."}
      </p>
      <form className="mt-8 space-y-4" onSubmit={onSubmit}>
        <label className="block text-sm font-medium">
          Holder name
          <input
            className="mt-1 h-11 w-full rounded-sm border border-rule bg-paper-raised px-3"
            value={holderName}
            onChange={(e) => setHolderName(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm font-medium">
          Credential title
          <input
            className="mt-1 h-11 w-full rounded-sm border border-rule bg-paper-raised px-3"
            value={degreeName}
            onChange={(e) => setDegreeName(e.target.value)}
            required
          />
        </label>
        {documentId ? (
          <p className="rounded-sm border border-rule bg-paper-raised px-3 py-3 font-mono text-xs break-all">
            Binding document {documentId}
          </p>
        ) : (
          <label className="block text-sm font-medium">
            Optional source file
            <input
              className="mt-1 block w-full text-sm"
              type="file"
              accept="application/pdf,image/png,image/jpeg,application/json,.pdf,.png,.jpg,.jpeg,.json"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <span className="mt-1 block text-xs text-stone">
              Leave empty to generate a diploma PDF. Filename is ignored; content is inspected.
            </span>
          </label>
        )}
        {error ? <p className="text-sm text-invalid">{error}</p> : null}
        <Button type="submit" disabled={busy}>
          {busy ? "Signing and anchoring…" : "Issue and register"}
        </Button>
      </form>
    </div>
  );
}
