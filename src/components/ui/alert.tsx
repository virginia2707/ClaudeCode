import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { Icon, type IconName } from "@/components/ui/icons";

export type AlertTone = "info" | "success" | "warning" | "danger";

const ICONS: Record<AlertTone, IconName> = {
  info: "info",
  success: "check",
  warning: "alert",
  danger: "alert",
};
const COLORS: Record<AlertTone, string> = {
  info: "text-info",
  success: "text-success",
  warning: "text-signal",
  danger: "text-danger",
};

export function Alert({
  tone = "info",
  title,
  children,
  className,
  live = false,
}: {
  tone?: AlertTone;
  title?: string;
  children: ReactNode;
  className?: string;
  /** true pour une alerte annoncée dynamiquement aux lecteurs d'écran. */
  live?: boolean;
}) {
  return (
    <div className={cn("alert", `alert-${tone}`, className)} role={live ? (tone === "danger" ? "alert" : "status") : undefined}>
      <Icon name={ICONS[tone]} className={cn("mt-0.5 h-4 w-4 shrink-0", COLORS[tone])} />
      <div className="space-y-0.5">
        {title && <p className="font-semibold text-text">{title}</p>}
        <div className="text-text-secondary">{children}</div>
      </div>
    </div>
  );
}
