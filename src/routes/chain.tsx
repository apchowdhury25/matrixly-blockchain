import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PublicHeader } from "@/components/layout/public-header";
import { Button } from "@/components/ui/button";
import {
  getDemoInclusionProof,
  getPublicLedgerExport,
  verifyPublicInclusionProof,
  verifyPublicLedgerExport,
} from "@/lib/trust/functions";
import { LEDGER_DIPLOMA_DISCLAIMER } from "@/lib/ledger/disclaimer";

export const Route = createFileRoute("/chain")({
  loader: async () => {
    const [chain, proof] = await Promise.all([getPublicLedgerExport(), getDemoInclusionProof()]);
    return { chain, proof };
  },
  component: ChainPage,
});

function ChainPage() {
  const { chain: data, proof } = Route.useLoaderData();
  const [paste, setPaste] = useState("");
  const [proofPaste, setProofPaste] = useState(proof.proofJson);
  const [independent, setIndependent] = useState<Awaited<ReturnType<typeof verifyPublicLedgerExport>> | null>(null);
  const [proofCheck, setProofCheck] = useState<Awaited<ReturnType<typeof verifyPublicInclusionProof>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const parsed = JSON.parse(paste);
      setIndependent(await verifyPublicLedgerExport({ data: { exportJson: JSON.stringify(parsed) } }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onProof(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setProofCheck(await verifyPublicInclusionProof({ data: { proofJson: proofPaste } }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      <PublicHeader />
      <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <p className="font-mono text-xs tracking-[0.22em] text-pine uppercase">Independent ledger</p>
        <h1 className="mt-3 font-display text-4xl">Hash-chain export</h1>
        <p className="mt-4 text-ink-soft">
          Download the append-only log and recompute block hashes yourself. The Merkle root is
          RFC 6962 over those hashes — not a Bitcoin tree. An inclusion proof shows a credential
          hash is in that tree without the full dump. Fabric dumps are refused without Gateway
          block data.
        </p>
        <aside className="mt-6 rounded-xl border border-rule bg-paper-raised p-5 text-sm leading-relaxed">
          <p className="font-medium">Not a diploma result</p>
          <p className="mt-2 text-ink-soft">{LEDGER_DIPLOMA_DISCLAIMER}</p>
          <p className="mt-2 text-ink-soft">
            <a href="/verify/demo-valid-bcs" className="underline underline-offset-4">
              Verify the demo diploma
            </a>{" "}
            for signature, file hash, status list, and schema.{" "}
            <span className="font-mono">included: true</span> is not VALID.
          </p>
        </aside>
        <dl className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-rule bg-paper-raised p-5">
            <dt className="text-sm text-stone">Ledger hashes</dt>
            <dd className="text-ink">{data.chainValid ? "Match" : data.reason ?? "Broken"}</dd>
            <p className="mt-2 text-xs text-stone">Not diploma VALID</p>
          </div>
          <div className="rounded-xl border border-rule bg-paper-raised p-5">
            <dt className="text-sm text-stone">Blocks</dt>
            <dd className="font-display text-3xl tabular-nums">{data.length}</dd>
          </div>
        </dl>
        <p className="mt-4 break-all font-mono text-xs text-stone">Head {data.head?.blockHash ?? "—"}</p>
        <p className="mt-2 break-all font-mono text-xs text-stone">
          Merkle {data.merkleRoot ?? "—"} ({data.merkleAlgorithm ?? "rfc6962-sha256"})
        </p>
        <p className="mt-6 text-sm">
          <a href="/api/v1/ledger/chain" className="underline underline-offset-4">
            GET /api/v1/ledger/chain
          </a>
          {" · "}
          POST /api/v1/ledger/verify does not evaluate diplomas
        </p>

        <h2 className="mt-12 font-display text-2xl">Inclusion proof</h2>
        <p className="mt-3 text-sm text-ink-soft">
          Demo diploma {proof.included ? "is in the tree" : proof.reason ?? "not found"} · path{" "}
          {proof.pathLength} · seq {proof.seq ?? "—"}
        </p>
        <p className="mt-2 break-all font-mono text-xs text-stone">{proof.credentialHash}</p>
        <p className="mt-3 text-sm">
          <a
            href={
              proof.credentialHash
                ? `/api/v1/ledger/proof?credentialHash=${encodeURIComponent(proof.credentialHash)}`
                : "/api/v1/ledger/proof"
            }
            className="underline underline-offset-4"
          >
            GET /api/v1/ledger/proof
          </a>
          {" · "}
          POST /api/v1/ledger/proof/verify
        </p>

        <form className="mt-6 space-y-3" onSubmit={onProof}>
          <label className="text-sm font-medium">Paste an inclusion proof</label>
          <textarea
            className="h-32 w-full rounded-sm border border-rule bg-paper-raised p-3 font-mono text-xs"
            value={proofPaste}
            onChange={(e) => setProofPaste(e.target.value)}
          />
          <Button type="submit" disabled={busy || !proofPaste.trim()}>
            {busy ? "Checking…" : "Recompute inclusion"}
          </Button>
        </form>
        {proofCheck ? (
          <p className="mt-4 text-sm text-ink-soft">
            {proofCheck.included
              ? `included · diploma not evaluated · root ${proofCheck.merkleRoot}`
              : proofCheck.reason ?? "Not included"}
          </p>
        ) : null}

        <form className="mt-10 space-y-3" onSubmit={onVerify}>
          <label className="text-sm font-medium">Paste an export (optional)</label>
          <textarea
            className="h-40 w-full rounded-sm border border-rule bg-paper-raised p-3 font-mono text-xs"
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder='{"format":"matrixly.ledger.v1",...}'
          />
          <Button type="submit" disabled={busy || !paste.trim()}>
            {busy ? "Checking…" : "Recompute hashes"}
          </Button>
        </form>
        {error ? <p className="mt-4 text-invalid">{error}</p> : null}
        {independent ? (
          <p className="mt-4 text-sm text-ink-soft">
            {independent.chainValid
              ? `Ledger hashes match · ${independent.length} blocks · diploma not evaluated`
              : independent.reason ?? "Broken"}
          </p>
        ) : null}
      </main>
    </div>
  );
}
