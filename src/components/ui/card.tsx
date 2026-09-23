import type { ComponentProps } from "react";
import { cn } from "@/lib/utils/cn";

// `ref` est omis : les éléments acceptés n'ont pas le même type de référence,
// et une carte n'a pas besoin d'être référencée.
type CardProps = Omit<ComponentProps<"div">, "ref"> & {
  variant?: "default" | "elevated" | "inset";
  /** Élément rendu : `section` quand la carte porte un titre et fait section. */
  as?: "div" | "section" | "article";
};

export function Card({ variant = "default", className, as: Tag = "div", ...rest }: CardProps) {
  const base = variant === "elevated" ? "card-elevated" : variant === "inset" ? "card-inset" : "card";
  return <Tag className={cn(base, className)} {...rest} />;
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
