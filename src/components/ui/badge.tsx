import type { ComponentProps } from "react";
import { cn } from "@/lib/utils/cn";

export type BadgeTone = "neutral" | "accent" | "success" | "signal" | "danger" | "info";

export function Badge({ tone = "neutral", className, ...rest }: ComponentProps<"span"> & { tone?: BadgeTone }) {
  return <span className={cn("badge", tone !== "neutral" && `badge-${tone}`, className)} {...rest} />;
}
