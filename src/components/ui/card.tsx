import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({
  className,
  children,
  glow = false,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode; glow?: boolean }) {
  return (
    <div className={cn(glow ? "card-glow" : "card", "p-5 sm:p-6", className)} {...rest}>
      {children}
    </div>
  );
}
