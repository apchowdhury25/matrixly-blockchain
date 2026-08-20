import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { issueDegree } from "@/lib/trust/functions";

export const Route = createFileRoute("/app/issue")({ component: IssuePage });

function IssuePage() {
  const navigate = useNavigate();
  const [holderName, setHolderName] = useState("Alex Rivera");
  const [degreeName, setDegreeName] = useState("Bachelor of Computer Science");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await issueDegree({
        data: {
          holderName,
          degreeName,
          idempotencyKey: crypto.randomUUID(),
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
      <h1 className="font-display text-4xl">Issue a diploma</h1>
      <p className="mt-2 text-ink-soft">
        Generates a PDF, SHA-256 hash, W3C VC 2.0, Ed25519 proof, and ledger anchors. Replay the same
        idempotency key and exactly one credential is created.
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
        {error ? <p className="text-sm text-invalid">{error}</p> : null}
        <Button type="submit" disabled={busy}>
          {busy ? "Signing and anchoring…" : "Issue and register"}
        </Button>
      </form>
    </div>
  );
}
