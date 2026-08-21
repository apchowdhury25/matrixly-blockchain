import { Link, useRouterState } from "@tanstack/react-router";
import { UserButton } from "@/lib/auth/gates";
import { Wordmark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const links = [
  { to: "/wallet", label: "Wallet" },
] as const;

export function WalletShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-rule bg-paper-raised">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Wordmark compact />
          <div className="flex items-center gap-3">
            <Link to="/app" className="hidden text-sm text-ink-soft hover:text-ink sm:inline">
              Issuer console
            </Link>
            <Link to="/verify" className="hidden text-sm text-ink-soft hover:text-ink sm:inline">
              Public verifier
            </Link>
            <UserButton />
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-3 sm:px-6">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={cn(
                "rounded-sm px-3 py-2 text-sm whitespace-nowrap",
                pathname === l.to ? "bg-pine text-pine-fg" : "text-ink-soft hover:bg-paper hover:text-ink",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</div>
    </div>
  );
}
