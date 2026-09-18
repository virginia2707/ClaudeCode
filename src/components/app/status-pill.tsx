import { Pill } from "@/components/ui/pill";

const map = {
  DRAFT: { label: "Brouillon", tone: "neutral" },
  PUBLISHED: { label: "Publié", tone: "success" },
  ARCHIVED: { label: "Archivé", tone: "warning" },
  LOBBY: { label: "Lobby", tone: "info" },
  RUNNING: { label: "En cours", tone: "success" },
  PAUSED: { label: "En pause", tone: "warning" },
  ENDED: { label: "Terminée", tone: "neutral" },
} as const;

export function StatusPill({ status }: { status: string }) {
  const item = map[status as keyof typeof map] ?? { label: status, tone: "neutral" as const };
  return <Pill tone={item.tone}>{item.label}</Pill>;
}
