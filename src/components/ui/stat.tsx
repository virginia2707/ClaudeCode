import { cn } from "@/lib/utils/cn";

export function Stat({ label, value, hint, className }: { label: string; value: string; hint?: string; className?: string }) {
  return (
    <div className={cn("card-inset p-4", className)}>
      <p className="text-xs uppercase tracking-wider text-text-muted font-medium">{label}</p>
      <p className="mono-num mt-1 text-2xl font-semibold text-text">{value}</p>
      {hint && <p className="mt-1 text-xs text-text-muted">{hint}</p>}
    </div>
  );
}
