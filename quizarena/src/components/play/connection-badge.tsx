import type { ConnectionStatus } from "@/hooks/use-game-stream";
import { cn } from "@/lib/utils";

export function ConnectionBadge({ status }: { status: ConnectionStatus }) {
  const map: Record<ConnectionStatus, { label: string; cls: string }> = {
    connecting: { label: "Connexion…", cls: "pill-info" },
    live: { label: "En direct", cls: "pill-success" },
    polling: { label: "Mode dégradé", cls: "pill-spark" },
    offline: { label: "Reconnexion…", cls: "pill-danger" },
  };
  const m = map[status];
  return (
    <span className={cn("pill", m.cls)} role="status" aria-live="polite">
      <span className={cn("size-1.5 rounded-full bg-current", status === "live" && "animate-pulse")} aria-hidden="true" />
      {m.label}
    </span>
  );
}
