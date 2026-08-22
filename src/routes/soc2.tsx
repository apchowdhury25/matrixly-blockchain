import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicHeader } from "@/components/layout/public-header";
import { SOC2_CRITERIA, SOC2_DISCLAIMER } from "@/lib/compliance/soc2";

export const Route = createFileRoute("/soc2")({ component: Soc2Page });

function tone(coverage: string) {
  if (coverage === "software-support") return "text-valid";
  if (coverage === "organization-gap") return "text-warn";
  return "text-stone";
}

function Soc2Page() {
  return (
    <div className="min-h-screen bg-paper">
      <PublicHeader />
      <article className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <p className="font-mono text-xs tracking-[0.22em] text-pine uppercase">AICPA attestation</p>
        <h1 className="mt-3 font-display text-4xl">SOC 2 is not claimed</h1>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-ink-soft">{SOC2_DISCLAIMER}</p>
        <p className="mt-3 text-sm text-ink-soft">
          Security (CC1–CC9) is required in every SOC 2. Availability, processing integrity,
          confidentiality, and privacy are optional scope additions. Type I is design at a date.
          Type II is operating effectiveness over months. Only a CPA firm issues the report.
        </p>
        <p className="mt-3 text-sm">
          <Link to="/compliance" className="underline underline-offset-4">
            Engineering control matrix
          </Link>
          {" · "}
          REG-01 remains not-claimed
        </p>

        <div className="mt-8 overflow-x-auto rounded-xl border border-rule bg-paper-raised">
          <table className="w-full min-w-[840px] text-left text-sm">
            <thead className="border-b border-rule text-stone">
              <tr>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Criterion</th>
                <th className="px-4 py-3 font-medium">Auditor looks for</th>
                <th className="px-4 py-3 font-medium">This product</th>
                <th className="px-4 py-3 font-medium">Coverage</th>
              </tr>
            </thead>
            <tbody>
              {SOC2_CRITERIA.map((c) => (
                <tr key={c.id} className="border-b border-rule/70 last:border-0 align-top">
                  <td className="px-4 py-3 font-mono text-xs">{c.id}</td>
                  <td className="px-4 py-3">{c.category}</td>
                  <td className="px-4 py-3">{c.name}</td>
                  <td className="px-4 py-3 text-ink-soft">{c.auditorLooksFor}</td>
                  <td className="px-4 py-3 text-ink-soft">{c.matrixly}</td>
                  <td className={`px-4 py-3 font-mono text-xs ${tone(c.coverage)}`}>{c.coverage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-6 text-sm text-stone">
          software-support means an auditor could sample the code. It is not a Type II opinion.
        </p>
      </article>
    </div>
  );
}
