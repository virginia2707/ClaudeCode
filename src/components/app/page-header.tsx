import type { ReactNode } from "react";

export function PageHeader({ title, description, actions, eyebrow }: { title: string; description?: ReactNode; actions?: ReactNode; eyebrow?: string }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
      <div>
        {eyebrow ? <span className="eyebrow mb-2">{eyebrow}</span> : null}
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="mt-1.5 text-sm text-text-muted max-w-2xl">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
