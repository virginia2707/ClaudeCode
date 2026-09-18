import type { ComponentProps } from "react";
import { cn } from "@/lib/utils/cn";

type CardProps = ComponentProps<"div"> & { variant?: "default" | "elevated" | "inset" };

export function Card({ variant = "default", className, ...rest }: CardProps) {
  const base = variant === "elevated" ? "card-elevated" : variant === "inset" ? "card-inset" : "card";
  return <div className={cn(base, className)} {...rest} />;
}

export function CardHeader({ className, ...rest }: ComponentProps<"div">) {
  return <div className={cn("flex items-start justify-between gap-4 p-5 pb-0", className)} {...rest} />;
}

export function CardTitle({ className, ...rest }: ComponentProps<"h3">) {
  return <h3 className={cn("h3", className)} {...rest} />;
}

export function CardBody({ className, ...rest }: ComponentProps<"div">) {
  return <div className={cn("p-5", className)} {...rest} />;
}
