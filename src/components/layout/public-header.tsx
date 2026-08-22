import { Link } from "@tanstack/react-router";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Wordmark } from "@/components/brand/logo";

export function PublicHeader() {
  const { user, isPending } = useCurrentUserState();
  return (
    <header className="sticky top-0 z-20 border-b border-rule/80 bg-paper/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Wordmark />
        <nav className="flex items-center gap-1 text-sm">
          <Link to="/verify" className="hidden rounded-sm px-3 py-2 text-ink-soft hover:text-ink sm:inline">
            Verify
          </Link>
          <Link to="/oid4vci" className="rounded-sm px-3 py-2 font-medium text-pine hover:text-pine-deep">
            OpenID4VCI
          </Link>
          <Link to="/oid4vp" className="hidden rounded-sm px-3 py-2 text-ink-soft hover:text-ink md:inline">
            OpenID4VP
          </Link>
          <Link to="/wallet" className="hidden rounded-sm px-3 py-2 text-ink-soft hover:text-ink sm:inline">
            Wallet
          </Link>
          <Link to="/developers" className="hidden rounded-sm px-3 py-2 text-ink-soft hover:text-ink sm:inline">
            Developers
          </Link>
          <Link to="/schemas/university-degree" className="hidden rounded-sm px-3 py-2 text-ink-soft hover:text-ink lg:inline">
            Schema
          </Link>
          <Link to="/compliance" className="hidden rounded-sm px-3 py-2 text-ink-soft hover:text-ink sm:inline">
            Compliance
          </Link>
          <Link to="/soc2" className="hidden rounded-sm px-3 py-2 text-ink-soft hover:text-ink lg:inline">
            SOC 2
          </Link>
          <Link to="/chain" className="hidden rounded-sm px-3 py-2 text-ink-soft hover:text-ink lg:inline">
            Chain
          </Link>
          <Link to="/sd-jwt" className="hidden rounded-sm px-3 py-2 text-ink-soft hover:text-ink xl:inline">
            SD-JWT
          </Link>
          {isPending ? (
            <div className="h-9 w-20 animate-pulse rounded-sm bg-rule/60" />
          ) : user ? (
            <div className="flex items-center gap-3">
              <Link to="/app" className="rounded-sm px-3 py-2 text-ink-soft hover:text-ink">
                Issuer console
              </Link>
              <UserButton />
            </div>
          ) : (
            <Link
              to="/login"
              search={{ next: undefined }}
              className="rounded-sm bg-pine px-4 py-2 text-sm font-medium text-pine-fg hover:bg-pine-deep"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
