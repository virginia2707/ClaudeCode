import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-grid size-8 place-items-center rounded-lg bg-[linear-gradient(135deg,var(--primary),var(--spark))] text-sm font-black text-white shadow-[0_6px_20px_rgba(124,108,255,0.35)]",
        className,
      )}
    >
      Q
    </span>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 font-bold tracking-tight", className)} aria-label="QuizArena — accueil">
      <LogoMark />
      <span>
        Quiz<span className="text-gradient">Arena</span>
      </span>
    </Link>
  );
}
