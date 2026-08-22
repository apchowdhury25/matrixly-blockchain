import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PublicHeader } from "@/components/layout/public-header";
import { Button } from "@/components/ui/button";
import { acceptInvite, peekInvite } from "@/lib/trust/functions";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/invite/$token")({
  loader: async ({ params }) => {
    try {
      return await peekInvite({ data: { token: params.token } });
    } catch {
      return {
        email: "",
        role: "",
        status: "INVALID",
        expiresAt: "",
        orgName: "this organization",
      };
    }
  },
  component: InvitePage,
});

function InvitePage() {
  const invite = Route.useLoaderData();
  const { token } = Route.useParams();
  const { user } = useCurrentUserState();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onAccept() {
    setBusy(true);
    setError(null);
    try {
      await acceptInvite({ data: { token } });
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      <PublicHeader />
      <main className="mx-auto max-w-lg px-4 py-14 sm:px-6">
        <p className="font-mono text-xs tracking-[0.22em] text-pine uppercase">Membership</p>
        <h1 className="mt-3 font-display text-4xl">Join {invite.orgName}</h1>
        <p className="mt-4 text-ink-soft">
          Role <span className="font-mono text-sm">{invite.role}</span> for{" "}
          <span className="font-mono text-sm">{invite.email}</span>. Sign in with that address. This
          is not a diploma and not a Verifiable Credential.
        </p>
        {invite.status !== "PENDING" ? (
          <p className="mt-6 text-invalid">This invite is {invite.status.toLowerCase()}.</p>
        ) : done ? (
          <p className="mt-6">
            Joined. Open the{" "}
            <Link to="/app" className="underline underline-offset-4">
              issuer console
            </Link>
            .
          </p>
        ) : (
          <div className="mt-8">
            {user ? (
              <Button type="button" disabled={busy} onClick={onAccept}>
                {busy ? "Joining…" : "Accept invite"}
              </Button>
            ) : (
              <p className="text-ink-soft">Sign in first, then accept this invite.</p>
            )}
          </div>
        )}
        {error ? <p className="mt-4 text-invalid">{error}</p> : null}
      </main>
    </div>
  );
}
