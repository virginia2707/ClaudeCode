import type { ReactNode } from "react";

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="card p-8 sm:p-10 text-center">
      {icon ? <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent">{icon}</div> : null}
      <h2 className="font-semibold text-lg">{title}</h2>
      {description ? <p className="mt-1.5 text-sm text-text-muted max-w-md mx-auto">{description}</p> : null}
      {action ? <div className="mt-5 flex justify-center gap-2">{action}</div> : null}
    </div>
  );
}
