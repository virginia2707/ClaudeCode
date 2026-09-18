import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "primary" | "spark" | "success" | "danger" | "info";
const toneClass: Record<Tone, string> = {
  neutral: "",
  primary: "pill-primary",
  spark: "pill-spark",
  success: "pill-success",
  danger: "pill-danger",
  info: "pill-info",
};

export function Pill({ tone = "neutral", className, ...rest }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return <span className={cn("pill", toneClass[tone], className)} {...rest} />;
}
