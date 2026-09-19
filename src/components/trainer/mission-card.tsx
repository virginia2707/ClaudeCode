import Link from "next/link";
import { archiveMissionAction, deleteMissionAction, duplicateMissionAction } from "@/actions/mission-actions";
import { ConfirmAction, InlineAction } from "@/components/trainer/confirm-action";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icons";
import { MISSION_STATUS_LABELS } from "@/lib/data/mission-filters";
import { LEVEL_LABELS, type Level, type MissionStatus } from "@/lib/constants";
import type { MissionListItem } from "@/lib/data/missions";

const STATUS_TONE: Record<MissionStatus, BadgeTone> = {
  DRAFT: "signal",
  IN_REVIEW: "info",
  PUBLISHED: "success",
  ARCHIVED: "neutral",
};

const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });

export function MissionCard({ mission, canDelete }: { mission: MissionListItem; canDelete: boolean }) {
  const status = mission.status as MissionStatus;
  const archived = status === "ARCHIVED";
  return (
    <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="h3">
            <Link href={`/app/trainer/missions/${mission.id}`} className="hover:text-accent">
              {mission.title}
            </Link>
          </h3>
          <Badge tone={STATUS_TONE[status]}>{MISSION_STATUS_LABELS[status]}</Badge>
          {mission.sourceType === "AI_GENERATED" && <Badge tone="accent">IA</Badge>}
          {mission.sourceType === "DUPLICATED" && <Badge>copie</Badge>}
        </div>
        {mission.description && <p className="mt-1.5 line-clamp-2 text-sm text-text-secondary">{mission.description}</p>}

        <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
          {mission.jobTitle && (
            <li className="flex items-center gap-1.5">
              <Icon name="compass" className="h-3.5 w-3.5" />
              {mission.jobTitle}
              {mission.sector ? ` · ${mission.sector}` : ""}
            </li>
          )}
          <li className="flex items-center gap-1.5">
            <Icon name="clock" className="h-3.5 w-3.5" />
            <span className="mono-num">{mission.durationMinutes}</span> min
          </li>
          <li className="flex items-center gap-1.5">
            <Icon name="layers" className="h-3.5 w-3.5" />
            <span className="mono-num">{mission._count.steps}</span> étape{mission._count.steps > 1 ? "s" : ""}
          </li>
          <li className="flex items-center gap-1.5">
            <Icon name="users" className="h-3.5 w-3.5" />
            <span className="mono-num">{mission._count.sessions}</span> session{mission._count.sessions > 1 ? "s" : ""}
          </li>
          <li>{LEVEL_LABELS[mission.difficulty as Level] ?? mission.difficulty}</li>
          <li>modifiée le {dateFmt.format(mission.updatedAt)}</li>
        </ul>

        {mission.skills.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {mission.skills.slice(0, 4).map((s) => (
              <li key={s.id}>
                <Badge>{s.skill.name}</Badge>
              </li>
            ))}
            {mission.skills.length > 4 && (
              <li>
                <Badge>+{mission.skills.length - 4}</Badge>
              </li>
            )}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-start gap-2 sm:flex-col sm:items-end">
        <InlineAction action={duplicateMissionAction} hiddenFields={{ missionId: mission.id }} label="Dupliquer" pendingLabel="Copie…" />
        <InlineAction
          action={archiveMissionAction}
          hiddenFields={{ missionId: mission.id, target: archived ? "DRAFT" : "ARCHIVED" }}
          label={archived ? "Restaurer" : "Archiver"}
          variant="ghost"
          pendingLabel="…"
        />
        {canDelete && (
          <ConfirmAction
            action={deleteMissionAction}
            hiddenFields={{ missionId: mission.id }}
            label="Supprimer"
            confirmLabel="Supprimer définitivement"
            question="Confirmer ?"
            variant="ghost"
          />
        )}
      </div>
    </Card>
  );
}
