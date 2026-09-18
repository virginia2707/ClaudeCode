import type { ReactNode } from "react";

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div className="text-lg font-semibold">{title}</div>
      {description ? <p className="max-w-md text-sm text-text-muted">{description}</p> : null}
      {action}
    </div>
  );
}
