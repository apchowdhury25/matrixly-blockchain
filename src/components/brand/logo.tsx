import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="currentColor" />
      <circle cx="16" cy="16" r="10" fill="none" stroke="#F2EFE8" strokeWidth="2" />
      <circle cx="16" cy="16" r="6.25" fill="none" stroke="#F2EFE8" strokeWidth="1.5" />
      <path fill="#F2EFE8" d="M16 11 L17.2 15.2 L21.5 16 L17.2 16.8 L16 21 L14.8 16.8 L10.5 16 L14.8 15.2 Z" />
    </svg>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5 text-ink">
      <Mark className="text-pine" />
      <span className="font-display text-lg tracking-tight">
        Matrixly {compact ? "" : <span className="text-stone">Trust</span>}
      </span>
    </Link>
  );
}
