import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicHeader } from "@/components/layout/public-header";
import { getComplianceMatrix } from "@/lib/trust/functions";

export const Route = createFileRoute("/compliance")({
  loader: () => getComplianceMatrix(),
  component: CompliancePage,
});

function tone(status: string) {
  if (status === "implemented") return "text-valid";
  if (status === "fail-closed") return "text-warn";
  return "text-stone";
}

function CompliancePage() {
  const data = Route.useLoaderData();
  return (
    <div className="min-h-screen bg-paper">
      <PublicHeader />
      <article className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <p className="font-mono text-xs tracking-[0.22em] text-pine uppercase">Controls</p>
        <h1 className="mt-3 font-display text-4xl">Compliance matrix</h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft">{data.disclaimer}</p>
        <p className="mt-3 text-sm">
          SOC 2 Type I/II is not claimed. Read the{" "}
          <Link to="/soc2" className="underline underline-offset-4">
            SOC 2 investigation
          </Link>
          .
        </p>
        <div className="mt-8 overflow-x-auto rounded-xl border border-rule bg-paper-raised">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-rule text-stone">
              <tr>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Area</th>
                <th className="px-4 py-3 font-medium">Control</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Evidence</th>
              </tr>
            </thead>
            <tbody>
              {data.controls.map((c) => (
                <tr key={c.id} className="border-b border-rule/70 last:border-0 align-top">
                  <td className="px-4 py-3 font-mono text-xs">{c.id}</td>
                  <td className="px-4 py-3">{c.area}</td>
                  <td className="px-4 py-3">{c.control}</td>
                  <td className={`px-4 py-3 font-mono text-xs ${tone(c.status)}`}>{c.status}</td>
                  <td className="px-4 py-3 text-ink-soft">{c.evidence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
}
