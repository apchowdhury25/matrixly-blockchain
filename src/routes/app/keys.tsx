import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { listKeys, rotateIssuerKey } from "@/lib/trust/functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/keys")({ component: KeysPage });

function KeysPage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof listKeys>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    listKeys()
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onRotate() {
    if (
      !window.confirm(
        "Rotation creates a new did:key. Previously issued credentials keep verifying against the old DID. The previous secret stays sealed and cannot sign.",
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const next = await rotateIssuerKey();
      setNotice(`New signing DID is ${next.did}`);
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="font-mono text-xs tracking-[0.18em] text-stone uppercase">Identity</p>
      <h1 className="mt-2 font-display text-4xl">Verification methods</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">
        Public keys only. Secret keys are sealed by {data?.kms ?? "the configured KMS"} and never returned by the API. A did:key
        rotation issues a new identifier; historical credentials still verify against the prior DID.
      </p>
      {error ? <p className="mt-4 text-invalid">{error}</p> : null}
      {notice ? <p className="mt-4 text-valid">{notice}</p> : null}
      {data?.permissions.rotateKeys ? (
        <div className="mt-6">
          <Button type="button" variant="secondary" disabled={busy} onClick={onRotate}>
            {busy ? "Rotating…" : "Rotate signing key"}
          </Button>
        </div>
      ) : (
        <p className="mt-6 text-sm text-stone">Key rotation requires the TENANT_ADMIN role.</p>
      )}
      <div className="mt-8 space-y-4">
        {(data?.keys ?? []).map((r) => {
          const multibase = r.did.startsWith("did:key:") ? r.did.slice("did:key:".length) : r.public_key_multibase;
          const current = r.did === data?.issuerDid;
          return (
            <div key={r.did} className="rounded-xl border border-rule bg-paper-raised p-5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-mono text-xs tracking-[0.16em] text-stone uppercase">
                  {r.status}
                  {r.key_status && r.key_status !== r.status ? ` · key ${r.key_status}` : ""}
                </p>
                {current ? (
                  <span className="rounded-sm bg-pine px-2 py-0.5 text-[11px] font-medium text-pine-fg">
                    Current signer
                  </span>
                ) : null}
              </div>
              <p className="mt-3 break-all font-mono text-xs leading-relaxed">{r.did}</p>
              <p className="mt-4 text-sm text-stone">publicKeyMultibase</p>
              <p className="mt-1 break-all font-mono text-xs">{r.public_key_multibase}</p>
              {r.document_hash ? (
                <>
                  <p className="mt-4 text-sm text-stone">DID document hash</p>
                  <p className="mt-1 break-all font-mono text-xs">{r.document_hash}</p>
                </>
              ) : null}
              <Link
                to="/did/$multibase"
                params={{ multibase }}
                className="mt-4 inline-flex h-11 items-center text-sm text-pine hover:underline"
              >
                Open public DID document
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
