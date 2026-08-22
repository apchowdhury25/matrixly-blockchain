import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicHeader } from "@/components/layout/public-header";

export const Route = createFileRoute("/sd-jwt")({ component: SdJwtNotesPage });

function SdJwtNotesPage() {
  return (
    <div className="min-h-screen bg-paper">
      <PublicHeader />
      <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <p className="font-mono text-xs tracking-[0.22em] text-pine uppercase">Interop notes</p>
        <h1 className="mt-3 font-display text-4xl">SD-JWT is not supported</h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-soft">
          Matrixly issues W3C Verifiable Credentials 2.0 with Data Integrity. That is not Selective
          Disclosure JWT. We refuse SD-JWT rather than wrap a diploma in a JWT and call it valid.
          This page is not HAIP, EUDI, or IETF certification.
        </p>

        <h2 className="mt-10 font-display text-2xl">What wallets send</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-rule bg-paper-raised">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-rule text-stone">
              <tr>
                <th className="px-4 py-3 font-medium">Format</th>
                <th className="px-4 py-3 font-medium">Meaning</th>
                <th className="px-4 py-3 font-medium">Here</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-rule/70">
                <td className="px-4 py-3 font-mono text-xs">ldp_vc</td>
                <td className="px-4 py-3">W3C VC + Data Integrity</td>
                <td className="px-4 py-3 text-valid">Implemented</td>
              </tr>
              <tr className="border-b border-rule/70">
                <td className="px-4 py-3 font-mono text-xs">dc+sd-jwt</td>
                <td className="px-4 py-3">IETF SD-JWT VC</td>
                <td className="px-4 py-3 text-invalid">Refused</td>
              </tr>
              <tr className="border-b border-rule/70">
                <td className="px-4 py-3 font-mono text-xs">vc+sd-jwt</td>
                <td className="px-4 py-3">Older OpenID name</td>
                <td className="px-4 py-3 text-invalid">Refused</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-mono text-xs">mso_mdoc</td>
                <td className="px-4 py-3">ISO mdoc / mDL</td>
                <td className="px-4 py-3 text-invalid">Refused</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="mt-10 font-display text-2xl">Why dual-write is refused</h2>
        <p className="mt-3 leading-relaxed text-ink-soft">
          The ledger anchors one credential hash. An SD-JWT of the same diploma would be a different
          byte string and a different hash. Issuing both without a named legal requirement would
          either forge a shared hash or silently register two credentials for one PDF.
        </p>

        <h2 className="mt-10 font-display text-2xl">What a real adapter would need</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-ink-soft">
          <li>ECDSA P-256 keys as used by HAIP/EUDI — not a recast of our Ed25519 did:key.</li>
          <li>
            Proper <span className="font-mono text-sm">_sd</span> disclosures, <span className="font-mono text-sm">vct</span>,
            and a Key Binding JWT. Not a W3C VC stuffed into a JWT payload.
          </li>
          <li>IETF Token Status List — not our W3C Bitstring Status List under another name.</li>
          <li>Tests that a missing disclosure or missing KB-JWT never returns VALID.</li>
        </ul>
        <p className="mt-4 text-ink-soft">
          Until then, OpenID4VP and OpenID4VCI fail closed on these formats. See{" "}
          <Link to="/compliance" className="underline underline-offset-4">
            OID-02
          </Link>{" "}
          (not-claimed) and{" "}
          <Link to="/developers" className="underline underline-offset-4">
            Developers
          </Link>
          .
        </p>
      </article>
    </div>
  );
}
