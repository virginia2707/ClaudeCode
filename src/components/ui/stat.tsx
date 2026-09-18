import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Stat({
  label,
  value,
  hint,
  tone = "default",
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "accent" | "success" | "warning" | "danger";
  className?: string;
}) {
  const toneClass = {
    default: "text-text",
    accent: "text-accent",
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
  }[tone];
  return (
    <div className={cn("card-2 p-4", className)}>
      <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</div>
      <div className={cn("mt-1 text-2xl font-semibold tabular-nums", toneClass)}>{value}</div>
      {hint ? <div className="mt-1 text-xs text-text-subtle">{hint}</div> : null}
    </div>
  );
}
