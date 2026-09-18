import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "info" | "success" | "warning" | "danger";
const toneClass: Record<Tone, string> = {
  info: "border-info/40 bg-info-soft text-text",
  success: "border-success/40 bg-success-soft text-text",
  warning: "border-warning/40 bg-warning-soft text-text",
  danger: "border-danger/40 bg-danger-soft text-text",
};
const toneLabel: Record<Tone, string> = {
  info: "Information",
  success: "Succès",
  warning: "Attention",
  danger: "Erreur",
};

export function Alert({ tone = "info", title, children, className }: { tone?: Tone; title?: string; children: ReactNode; className?: string }) {
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("rounded-[var(--radius-sm)] border px-4 py-3 text-sm", toneClass[tone], className)}>
      <span className="sr-only">{toneLabel[tone]} : </span>
      {title ? <div className="font-semibold">{title}</div> : null}
      <div className={cn(title && "mt-1 text-text-muted")}>{children}</div>
    </div>
  );
}
