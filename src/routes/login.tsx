import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/brand/logo";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => {
    const next = typeof s.next === "string" ? s.next : undefined;
    if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/login")) {
      return { next: undefined as string | undefined };
    }
    return { next };
  },
  component: Login,
});

function Login() {
  const { next } = Route.useSearch();
  const dest = next ?? "/app";
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "up") {
        const res = await authClient.signUp.email({ email, password, name: name || email.split("@")[0]! });
        if (res.error) throw new Error(res.error.message || "Sign up failed");
      } else {
        const res = await authClient.signIn.email({ email, password });
        if (res.error) throw new Error(res.error.message || "Sign in failed");
      }
      window.location.assign(dest);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-paper px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-rule bg-paper-raised p-8 shadow-quiet">
        <Wordmark />
        <h1 className="mt-6 font-display text-3xl">Sign in</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Issuers issue credentials. Holders claim them into a wallet. Public verification does not
          require an account.
        </p>
        {!authEnabled ? (
          <p className="mt-6 text-sm text-stone">Sign-in is disabled.</p>
        ) : (
          <>
            <div className="mt-6 space-y-2">
              {GROK_PROVIDERS.map((p) => (
                <Button
                  key={p.providerId}
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() => signIn(p.providerId, { callbackURL: dest })}
                >
                  Continue with {p.label}
                </Button>
              ))}
            </div>
            <p className="my-5 text-center text-xs tracking-[0.18em] text-stone uppercase">or email</p>
            <form className="space-y-3" onSubmit={onEmail}>
              {mode === "up" ? (
                <input
                  className="h-11 w-full rounded-sm border border-rule bg-paper px-3 text-sm"
                  placeholder="Organization name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              ) : null}
              <input
                className="h-11 w-full rounded-sm border border-rule bg-paper px-3 text-sm"
                type="email"
                required
                placeholder="work@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                className="h-11 w-full rounded-sm border border-rule bg-paper px-3 text-sm"
                type="password"
                required
                minLength={8}
                placeholder="Password (8+ characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {error ? <p className="text-sm text-invalid">{error}</p> : null}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Working…" : mode === "up" ? "Create issuer account" : "Sign in with email"}
              </Button>
            </form>
            <button
              type="button"
              className="mt-4 text-sm text-ink-soft underline-offset-4 hover:underline"
              onClick={() => setMode(mode === "in" ? "up" : "in")}
            >
              {mode === "in" ? "Need an account? Create one" : "Already registered? Sign in"}
            </button>
          </>
        )}
        <p className="mt-6 text-center text-sm">
          <Link to="/verify" className="text-ink-soft hover:text-ink">
            Verify a document without signing in
          </Link>
        </p>
      </div>
    </main>
  );
}
