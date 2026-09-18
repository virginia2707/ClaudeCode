import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: "info" | "success" | "danger" | "spark";
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  const toneClass = {
    info: "border-[rgba(79,195,247,0.35)] bg-info-soft text-info",
    success: "border-[rgba(62,213,152,0.35)] bg-success-soft text-success",
    danger: "border-[rgba(255,107,107,0.35)] bg-danger-soft text-danger",
    spark: "border-[rgba(255,181,71,0.35)] bg-spark-soft text-spark",
  }[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("rounded-xl border px-4 py-3 text-sm", toneClass, className)}>
      {title ? <div className="font-semibold">{title}</div> : null}
      {children ? <div className={cn(title && "mt-0.5", "text-text")}>{children}</div> : null}
    </div>
  );
}
