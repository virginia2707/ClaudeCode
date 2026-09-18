import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  as: Tag = "h2",
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  as?: "h1" | "h2" | "h3";
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow ? <span className={cn("eyebrow mb-3", align === "center" && "justify-center")}>{eyebrow}</span> : null}
      <Tag className="text-3xl sm:text-4xl font-semibold tracking-tight text-balance">{title}</Tag>
      {description ? <p className="mt-4 text-base sm:text-lg text-text-muted text-pretty">{description}</p> : null}
    </div>
  );
}
