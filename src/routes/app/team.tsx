import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { deactivateMember, inviteMember, listMembers, setMemberRole } from "@/lib/trust/functions";

export const Route = createFileRoute("/app/team")({ component: TeamPage });

function TeamPage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof listMembers>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("ISSUER");
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    listMembers()
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onInvite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setToken(null);
    try {
      const created = await inviteMember({ data: { email, role } });
      setToken(created.token);
      setEmail("");
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="font-mono text-xs tracking-[0.18em] text-stone uppercase">Access</p>
      <h1 className="mt-2 font-display text-4xl">Team</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">
        Only a tenant admin can invite. ISSUER may issue diplomas. AUDITOR may read audit and
        documents, not issue. The last TENANT_ADMIN cannot be removed. Invite tokens are shown once
        and stored as SHA-256 — this preview does not send email.
      </p>

      <form className="mt-8 flex flex-wrap items-end gap-3" onSubmit={onInvite}>
        <label className="block text-sm font-medium">
          Email
          <input
            type="email"
            className="mt-1 h-11 w-64 rounded-sm border border-rule bg-paper-raised px-3"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm font-medium">
          Role
          <select
            className="mt-1 h-11 rounded-sm border border-rule bg-paper-raised px-3"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="ISSUER">ISSUER</option>
            <option value="AUDITOR">AUDITOR</option>
            <option value="TENANT_ADMIN">TENANT_ADMIN</option>
          </select>
        </label>
        <Button type="submit" disabled={busy}>
          {busy ? "Inviting…" : "Create invite"}
        </Button>
      </form>

      {error ? <p className="mt-4 text-invalid">{error}</p> : null}
      {token ? (
        <div className="mt-6 rounded-xl border border-pine/30 bg-pine/8 p-5">
          <p className="text-sm font-medium">Copy this invite URL now. The token cannot be retrieved again.</p>
          <p className="mt-2 break-all font-mono text-xs">/invite/{token}</p>
        </div>
      ) : null}

      <div className="mt-8 overflow-x-auto rounded-xl border border-rule bg-paper-raised">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-rule text-stone">
            <tr>
              <th className="px-4 py-3 font-medium">Member</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {(data?.members ?? []).map((m) => (
              <tr key={m.id} className="border-b border-rule/70 last:border-0">
                <td className="px-4 py-3">
                  <p>{m.email ?? m.user_id}</p>
                  <p className="font-mono text-[11px] text-stone">{m.user_id}</p>
                </td>
                <td className="px-4 py-3">
                  <select
                    className="h-9 rounded-sm border border-rule bg-paper px-2"
                    value={m.role}
                    disabled={m.status !== "ACTIVE"}
                    onChange={(e) => {
                      setMemberRole({ data: { membershipId: m.id, role: e.target.value } })
                        .then(load)
                        .catch((err: Error) => setError(err.message));
                    }}
                  >
                    <option value="TENANT_ADMIN">TENANT_ADMIN</option>
                    <option value="ISSUER">ISSUER</option>
                    <option value="AUDITOR">AUDITOR</option>
                  </select>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{m.status}</td>
                <td className="px-4 py-3 text-right">
                  {m.status === "ACTIVE" ? (
                    <button
                      type="button"
                      className="text-sm text-invalid"
                      onClick={() => {
                        deactivateMember({ data: { membershipId: m.id } })
                          .then(load)
                          .catch((err: Error) => setError(err.message));
                      }}
                    >
                      Deactivate
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 font-display text-2xl">Invites</h2>
      <ul className="mt-4 divide-y divide-rule overflow-hidden rounded-xl border border-rule bg-paper-raised">
        {(data?.invites ?? []).map((inv) => (
          <li key={inv.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 text-sm">
            <span>
              {inv.email} · {inv.role}
            </span>
            <span className="font-mono text-xs text-stone">
              {inv.status} · expires {inv.expires_at.slice(0, 10)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
