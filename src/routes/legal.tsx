import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicHeader } from "@/components/layout/public-header";
import { LEGAL_LIABILITY_CLAUSE } from "@/lib/legal/liability";

export const Route = createFileRoute("/legal")({ component: LegalPage });

function LegalPage() {
  return (
    <div className="min-h-screen bg-paper">
      <PublicHeader />
      <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <p className="font-mono text-xs tracking-[0.22em] text-pine uppercase">Terms</p>
        <h1 className="mt-3 font-display text-4xl">Liability</h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-soft">{LEGAL_LIABILITY_CLAUSE}</p>
        <ul className="mt-8 list-disc space-y-2 pl-5 text-sm text-ink-soft">
          <li>Cryptographic checks can fail independently. A green badge is not a court finding.</li>
          <li>
            Ledger <span className="font-mono">chainValid</span> is not diploma VALID. See{" "}
            <Link to="/chain" className="underline underline-offset-4">
              Chain
            </Link>
            .
          </li>
          <li>SOC 2, HAIP, eIDAS, and ISO certifications are not claimed.</li>
          <li>This page is a software notice. It is not attorney-reviewed legal advice.</li>
        </ul>
      </article>
    </div>
  );
}
