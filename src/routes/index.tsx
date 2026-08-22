import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicHeader } from "@/components/layout/public-header";
import { DemoPlayground } from "@/components/verify/demo-playground";
import { getDemoCatalog, verifyOpaqueRef } from "@/lib/trust/functions";

export const Route = createFileRoute("/")({
  loader: async () => {
    const catalog = await getDemoCatalog();
    const result = await verifyOpaqueRef({ data: { ref: catalog.valid, mode: "bound" } });
    return { catalog, result };
  },
  component: Home,
});

const chain = [
  { k: "01", t: "Document", d: "Original PDF stays off-chain." },
  { k: "02", t: "SHA-256", d: "Canonical bytes, not a filename." },
  { k: "03", t: "VC 2.0", d: "W3C credential, no proprietary format." },
  { k: "04", t: "Ed25519", d: "Data Integrity eddsa-jcs-2022." },
  { k: "05", t: "Ledger", d: "Hash-chained anchor. No PII." },
  { k: "06", t: "Holder", d: "Wallet claim and signed presentation." },
  { k: "07", t: "Verify", d: "Every check can independently fail." },
];

function Home() {
  const { catalog, result } = Route.useLoaderData();
  return (
    <div className="min-h-screen bg-paper">
      <PublicHeader />
      <main>
        <section className="mx-auto max-w-6xl px-4 pt-14 pb-10 sm:px-6 sm:pt-20">
          <p className="font-mono text-xs tracking-[0.22em] text-pine uppercase">Matrixly Trust</p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl leading-[1.1] tracking-tight text-ink sm:text-6xl">
            Proof, not promises.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft">
            Issue diplomas, licenses, and certified records as W3C Verifiable Credentials. Bind the
            source file with SHA-256. Sign with Ed25519. Anchor only hashes on an append-only ledger.
            A verifier does not have to trust our database.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/oid4vci"
              className="inline-flex h-12 items-center rounded-sm bg-pine px-6 text-sm font-medium text-pine-fg hover:bg-pine-deep"
            >
              OpenID4VCI — pull a diploma
            </Link>
            <Link
              to="/verify"
              className="inline-flex h-12 items-center rounded-sm border border-rule px-6 text-sm font-medium text-ink hover:bg-paper-raised"
            >
              Public verifier
            </Link>
            <Link
              to="/trust"
              className="inline-flex h-12 items-center rounded-sm border border-rule px-6 text-sm font-medium text-ink hover:bg-paper-raised"
            >
              Trust model
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl">Live demonstration</h2>
              <p className="mt-1 max-w-xl text-sm text-ink-soft">
                Global University issued a Bachelor of Computer Science to Alex Rivera. Alter one byte
                of the PDF, revoke, or expire — verification must change.
              </p>
            </div>
          </div>
          <DemoPlayground initialCatalog={catalog} initialResult={result} />
        </section>

        <section className="border-y border-rule bg-paper-raised">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 md:grid-cols-7">
            {chain.map((step) => (
              <div key={step.k}>
                <p className="font-mono text-[11px] tracking-[0.18em] text-stone">{step.k}</p>
                <h3 className="mt-2 font-display text-xl">{step.t}</h3>
                <p className="mt-1 text-sm text-ink-soft">{step.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl">Built for registrars, not demos that return true.</h2>
            <p className="mt-4 text-ink-soft leading-relaxed">
              Signatures are Ed25519 over RFC 8785 canonical JSON. Document hashes are SHA-256 of the
              file bytes. The ledger is an append-only hash chain. Hyperledger Fabric is a first-class
              adapter — it is not silently stubbed to success.
            </p>
          </div>
          <div className="rounded-xl border border-rule bg-paper-raised p-6">
            <p className="font-mono text-[11px] tracking-[0.18em] text-stone uppercase">Off-chain / on-chain</p>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex justify-between gap-4 border-b border-rule pb-3">
                <span>Original PDF, PII, OCR</span>
                <span className="font-medium">Off-chain</span>
              </li>
              <li className="flex justify-between gap-4 border-b border-rule pb-3">
                <span>SHA-256, credential hash, DID</span>
                <span className="font-medium">On-chain</span>
              </li>
              <li className="flex justify-between gap-4">
                <span>Revocation bitstring index</span>
                <span className="font-medium">On-chain status</span>
              </li>
            </ul>
          </div>
        </section>
      </main>
      <footer className="border-t border-rule py-8 text-center text-sm text-stone">
        Matrixly Trust · cryptographic evidence over application assertions ·{" "}
        <Link to="/legal" className="underline underline-offset-4">
          Legal
        </Link>
      </footer>
    </div>
  );
}
