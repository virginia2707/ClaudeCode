import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icons";
import { Stat } from "@/components/ui/stat";
import { requirePermission } from "@/lib/auth/current-user";
import { MISSION_STATUS_LABELS, missionListHref } from "@/lib/data/mission-filters";
import { trainerDashboardData } from "@/lib/data/missions";
import type { MissionStatus, Plan } from "@/lib/constants";

export const metadata: Metadata = { title: "Tableau de bord formateur" };

const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });

export default async function TrainerDashboard() {
  const { user, membership } = await requirePermission("mission:create");
  const scope = { organizationId: membership.organizationId, userId: user.id };
  const data = await trainerDashboardData(scope, membership.organization.plan as Plan);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{membership.organization.name}</p>
          <h1 className="h1 mt-2">Bonjour {user.name.split(" ")[0]}.</h1>
          <p className="mt-2 text-text-secondary">Votre espace de conception : missions, sessions, apprenants et compétences.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/app/trainer/missions/new">Nouvelle mission</ButtonLink>
          <ButtonLink href="/app/trainer/missions" variant="secondary">
            Toutes les missions
          </ButtonLink>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Missions"
          value={String(data.counts.ALL)}
          hint={`${data.counts.PUBLISHED} publiée${data.counts.PUBLISHED > 1 ? "s" : ""} · ${data.counts.DRAFT} brouillon${data.counts.DRAFT > 1 ? "s" : ""}`}
        />
        <Stat label="Sessions" value={String(data.sessions)} hint={`${data.openSessions} ouverte${data.openSessions > 1 ? "s" : ""}`} />
        <Stat label="Apprenants" value={String(data.learners)} hint="membres actifs" />
        <Stat
          label="Compétences"
          value={String(data.skills)}
          hint={data.quota.limit === null ? `plan ${membership.organization.plan}` : `${data.quota.used}/${data.quota.limit} missions`}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section aria-labelledby="recent-missions">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="recent-missions" className="h3">
              Missions récentes
            </h2>
            <Link href="/app/trainer/missions" className="text-sm text-accent hover:underline">
              Voir tout
            </Link>
          </div>
          {data.recentMissions.length === 0 ? (
            <EmptyState
              title="Aucune mission."
              description="Créez votre première mission : une situation professionnelle à résoudre, pas un chapitre de cours."
              action={<ButtonLink href="/app/trainer/missions/new">Créer une mission</ButtonLink>}
            />
          ) : (
            <ul className="space-y-2">
              {data.recentMissions.map((m) => (
                <li key={m.id}>
                  <Card className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <Link href={`/app/trainer/missions/${m.id}`} className="font-medium hover:text-accent">
                        {m.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-text-muted">
                        <span className="mono-num">{m._count.steps}</span> étapes · modifiée le {dateFmt.format(m.updatedAt)}
                      </p>
                    </div>
                    <Badge tone={m.status === "PUBLISHED" ? "success" : m.status === "DRAFT" ? "signal" : "info"}>
                      {MISSION_STATUS_LABELS[m.status as MissionStatus]}
                    </Badge>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="recent-sessions">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="recent-sessions" className="h3">
              Sessions récentes
            </h2>
            <Link href="/app/trainer/sessions" className="text-sm text-accent hover:underline">
              Voir tout
            </Link>
          </div>
          {data.recentSessions.length === 0 ? (
            <EmptyState
              icon="users"
              title="Aucune session."
              description="Lancez une session pour faire jouer une mission publiée. Le lancement arrive en phase 14."
            />
          ) : (
            <ul className="space-y-2">
              {data.recentSessions.map((s) => (
                <li key={s.id}>
                  <Card className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{s.title}</p>
                      <p className="mt-0.5 truncate text-xs text-text-muted">
                        {s.mission.title} · <span className="mono-num">{s._count.participants}</span> participant
                        {s._count.participants > 1 ? "s" : ""}
                      </p>
                    </div>
                    <Badge tone={s.status === "OPEN" ? "success" : "neutral"}>{s.status === "OPEN" ? "ouverte" : s.status.toLowerCase()}</Badge>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <Card className="p-6">
        <h2 className="h3">Raccourcis</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { href: missionListHref({ status: "DRAFT" }), icon: "layers" as const, title: "Brouillons", text: `${data.counts.DRAFT} mission${data.counts.DRAFT > 1 ? "s" : ""} en cours de conception` },
            { href: "/app/trainer/skills", icon: "target" as const, title: "Compétences", text: "Votre référentiel et la bibliothèque MissionIA" },
            { href: "/app/trainer/learners", icon: "users" as const, title: "Apprenants", text: `${data.learners} apprenant${data.learners > 1 ? "s" : ""} dans l'organisation` },
          ].map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="card-inset flex h-full items-start gap-3 p-4 transition-colors hover:border-border-strong">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <Icon name={item.icon} className="h-4 w-4" />
                </span>
                <span>
                  <span className="block font-medium">{item.title}</span>
                  <span className="block text-xs text-text-muted">{item.text}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
