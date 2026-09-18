import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatTile({
  label,
  value,
  hint,
  tone = "neutral",
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "neutral" | "primary" | "spark" | "success" | "danger";
  className?: string;
}) {
  const valueColor = {
    neutral: "text-text",
    primary: "text-primary-strong",
    spark: "text-spark",
    success: "text-success",
    danger: "text-danger",
  }[tone];
  return (
    <div className={cn("card-2 p-4", className)}>
      <div className="text-xs font-semibold uppercase tracking-wider text-text-faint">{label}</div>
      <div className={cn("mt-1 text-2xl font-bold tabular-nums", valueColor)}>{value}</div>
      {hint ? <div className="mt-1 text-xs text-text-muted">{hint}</div> : null}
    </div>
  );
}
