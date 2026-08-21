import { createFileRoute } from "@tanstack/react-router";
import { PublicHeader } from "@/components/layout/public-header";

export const Route = createFileRoute("/trust")({ component: TrustModel });

function TrustModel() {
  return (
    <div className="min-h-screen bg-paper">
      <PublicHeader />
      <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <p className="font-mono text-xs tracking-[0.22em] text-pine uppercase">Architecture</p>
        <h1 className="mt-3 font-display text-4xl">Trust model</h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-soft">
          A verifier should be able to determine whether a document is authentic because of
          cryptographic evidence and a distributed ledger — not because an application row says VALID.
        </p>
        <h2 className="mt-10 font-display text-2xl">What is stored where</h2>
        <p className="mt-3 leading-relaxed text-ink-soft">
          Original files, holder PII, and tenant configuration stay off-chain in encrypted object
          storage (this preview uses a constrained application database). The ledger stores issuer
          DIDs, SHA-256 document hashes, credential hashes, and status changes.
        </p>
        <h2 className="mt-10 font-display text-2xl">Verification pipeline</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-ink-soft">
          <li>Parse and validate W3C VC 2.0 structure.</li>
          <li>Resolve the issuer DID (did:key / Ed25519). Other methods fail closed.</li>
          <li>Confirm the issuer is registered and ACTIVE on the ledger.</li>
          <li>Verify the Data Integrity Ed25519 proof over JCS canonical JSON.</li>
          <li>Hash supplied document bytes and compare to the bound SHA-256.</li>
          <li>Retrieve the ledger anchor and recompute the hash chain.</li>
          <li>Check Bitstring Status List revocation bits and validity dates.</li>
        </ol>
        <h2 className="mt-10 font-display text-2xl">Identity</h2>
        <p className="mt-3 leading-relaxed text-ink-soft">
          Issuers are identified by <span className="font-mono text-sm">did:key</span>. The public key is
          the identifier. Rotating a signing key creates a new DID; previously issued credentials keep
          verifying against the old DID. Secret keys are AES-256-GCM sealed and never leave the server.
          Tenant roles (admin, issuer, auditor) are enforced on the server, not only in the UI.
        </p>
        <h2 className="mt-10 font-display text-2xl">What this preview is not</h2>
        <p className="mt-3 leading-relaxed text-ink-soft">
          The running product uses a HashChainLedgerAdapter — a real append-only cryptographically
          linked log. Hyperledger Fabric is implemented as a Gateway adapter that refuses to operate
          without a network. It never returns true.
        </p>
      </article>
    </div>
  );
}
