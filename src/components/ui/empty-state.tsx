import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Icon, type IconName } from "@/components/ui/icons";

export function EmptyState({
  icon = "layers",
  title,
  description,
  action,
}: {
  icon?: IconName;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center px-6 py-14 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent">
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <p className="h3 mt-4">{title}</p>
      <p className="mt-2 max-w-md text-sm text-text-secondary">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </Card>
  );
}
