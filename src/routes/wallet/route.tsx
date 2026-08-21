import { createFileRoute, Navigate, Outlet, useRouterState } from "@tanstack/react-router";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { WalletShell } from "@/components/layout/wallet-shell";

export const Route = createFileRoute("/wallet")({ component: WalletLayout });

function WalletLayout() {
  const { user, isPending } = useCurrentUserState();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (isPending) {
    return (
      <div className="grid min-h-screen place-items-center bg-paper">
        <div className="h-10 w-40 animate-pulse rounded-sm bg-rule/70" />
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" search={{ next: pathname.startsWith("/") ? pathname : "/wallet" }} />;
  }
  return (
    <WalletShell>
      <Outlet />
    </WalletShell>
  );
}
