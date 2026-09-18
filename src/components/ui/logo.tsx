import Link from "next/link";
import { cn } from "@/lib/cn";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("h-8 w-8", className)} fill="none">
      <rect x="2" y="2" width="28" height="28" rx="8" className="fill-[var(--surface-3)] stroke-[var(--border-strong)]" />
      <path d="M10 11h12M10 16h8M10 21h12" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="22" cy="16" r="2.2" fill="var(--highlight)" />
    </svg>
  );
}

export function Logo({ href = "/", className, compact = false }: { href?: string; className?: string; compact?: boolean }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5 font-semibold tracking-tight", className)} aria-label="EscapeClass — accueil">
      <LogoMark />
      {!compact ? (
        <span className="text-lg">
          Escape<span className="text-accent">Class</span>
        </span>
      ) : null}
    </Link>
  );
}
