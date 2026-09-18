import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "accent" | "success" | "warning" | "danger" | "info" | "highlight";
const toneClass: Record<Tone, string> = {
  neutral: "",
  accent: "pill-accent",
  success: "pill-success",
  warning: "pill-warning",
  danger: "pill-danger",
  info: "pill-info",
  highlight: "pill-highlight",
};

export function Pill({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return <span className={cn("pill", toneClass[tone], className)}>{children}</span>;
}
