import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listKeys } from "@/lib/trust/functions";

export const Route = createFileRoute("/app/keys")({ component: KeysPage });

function KeysPage() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listKeys>>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listKeys()
      .then(setRows)
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <div>
      <h1 className="font-display text-4xl">Verification methods</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">
        Public keys only. Secret keys are AES-256-GCM sealed and never returned by the API.
      </p>
      {error ? <p className="mt-4 text-invalid">{error}</p> : null}
      <div className="mt-8 space-y-4">
        {rows.map((r) => (
          <div key={r.did} className="rounded-xl border border-rule bg-paper-raised p-5">
            <p className="text-sm text-stone">did:key</p>
            <p className="mt-2 break-all font-mono text-xs leading-relaxed">{r.did}</p>
            <p className="mt-4 text-sm text-stone">publicKeyMultibase</p>
            <p className="mt-2 break-all font-mono text-xs">{r.public_key_multibase}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
