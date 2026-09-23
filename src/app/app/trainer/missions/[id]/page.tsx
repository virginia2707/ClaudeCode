import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { archiveMissionAction, duplicateMissionAction } from "@/actions/mission-actions";
import { InlineAction } from "@/components/trainer/confirm-action";
import {
  ConstraintsEditor,
  LearnerRoleForm,
  MissionBasicsForm,
  MissionSettingsForm,
  MissionSkillsForm,
  ScenarioForm,
} from "@/components/trainer/mission-sections";
import { Alert } from "@/components/ui/alert";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon, type IconName } from "@/components/ui/icons";
import { requirePermission } from "@/lib/auth/current-user";
import { formatObjectives } from "@/lib/data/mission-schemas";
import { getMissionForEdit } from "@/lib/data/mission-editor";
import { MISSION_STATUS_LABELS } from "@/lib/data/mission-filters";
import { listSkills } from "@/lib/data/skills";
import type { MissionStatus } from "@/lib/constants";

export const metadata: Metadata = { title: "Mission" };

const STATUS_TONE: Record<MissionStatus, BadgeTone> = { DRAFT: "signal", IN_REVIEW: "info", PUBLISHED: "success", ARCHIVED: "neutral" };

/** Ce qui manque encore pour que la mission soit publiable (phase 5 et suivantes). */
function readiness(mission: NonNullable<Awaited<ReturnType<typeof getMissionForEdit>>>) {
  return [
    { label: "Briefing rédigé", done: !!mission.scenario?.briefing?.trim(), hint: "Section « Briefing immersif »." },
    { label: "Rôle attribué à l'apprenant", done: !!mission.learnerRole?.title?.trim(), hint: "Section « Rôle de l'apprenant »." },
    { label: "Au moins une contrainte", done: mission.constraints.length > 0, hint: "Section « Contraintes »." },
    { label: "Compétences déclarées", done: mission.skills.length > 0, hint: "Section « Compétences »." },
    { label: "Au moins une étape", done: mission.steps.length > 0, hint: "Le Mission Builder arrive en phase 5." },
  ];
}

function Section({
  id,
  title,
  description,
  icon,
  locked,
  children,
}: {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  locked: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card as="section" className="scroll-mt-20 p-6" id={id}>
      <div className="mb-5 flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
          <Icon name={icon} className="h-4 w-4" />
        </span>
        <div>
          <h2 className="h3">{title}</h2>
          <p className="mt-0.5 text-sm text-text-secondary">{description}</p>
        </div>
      </div>
      {/* `fieldset[disabled]` neutralise tous les champs et boutons descendants :
          la mission publiée reste consultable, mais pas modifiable. */}
      <fieldset disabled={locked} className={locked ? "opacity-70" : undefined}>
        {children}
      </fieldset>
    </Card>
  );
}

export default async function MissionDetailPage({ params }: PageProps<"/app/trainer/missions/[id]">) {
  const { id } = await params;
  const { user, membership } = await requirePermission("mission:create");
  const scope = { organizationId: membership.organizationId, userId: user.id };
  const mission = await getMissionForEdit(scope, id);
  if (!mission) notFound();

  const { own, global } = await listSkills(scope);
  const available = [
    ...own.map((s) => ({ id: s.id, name: s.name, category: s.category, scope: "org" as const })),
    ...global.map((s) => ({ id: s.id, name: s.name, category: s.category, scope: "global" as const })),
  ];
  const checks = readiness(mission);
  const remaining = checks.filter((c) => !c.done);
  const status = mission.status as MissionStatus;
  const locked = status === "PUBLISHED";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href="/app/trainer/missions" className="text-sm text-text-muted hover:text-text">
            ← Missions
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="h1">{mission.title}</h1>
            <Badge tone={STATUS_TONE[status]}>{MISSION_STATUS_LABELS[status]}</Badge>
          </div>
          <p className="mt-2 text-sm text-text-muted">
            Créée par {mission.createdBy.name} · <span className="mono-num">{mission.durationMinutes}</span> min ·{" "}
            <span className="mono-num">{mission._count.sessions}</span> session{mission._count.sessions > 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <Button disabled aria-disabled="true" title="La publication arrive une fois les étapes créées (phase 5)">
            Publier
          </Button>
          <InlineAction action={duplicateMissionAction} hiddenFields={{ missionId: mission.id }} label="Dupliquer" pendingLabel="Copie…" />
          <InlineAction
            action={archiveMissionAction}
            hiddenFields={{ missionId: mission.id, target: status === "ARCHIVED" ? "DRAFT" : "ARCHIVED" }}
            label={status === "ARCHIVED" ? "Restaurer" : "Archiver"}
            variant="ghost"
          />
        </div>
      </div>

      {locked && (
        <Alert tone="warning" title="Mission publiée : contenu figé">
          Des apprenants peuvent être en train de la jouer. Pour la faire évoluer, dupliquez-la et travaillez sur la copie, ou archivez-la d&apos;abord.
        </Alert>
      )}

      <Card variant="inset" className="p-5">
        <h2 className="h3">Avant publication</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {checks.map((c) => (
            <li key={c.label} className="flex items-start gap-2 text-sm">
              <Icon name={c.done ? "check" : "clock"} className={`mt-0.5 h-4 w-4 shrink-0 ${c.done ? "text-success" : "text-text-muted"}`} />
              <span className={c.done ? "text-text" : "text-text-muted"}>
                {c.label}
                <span className="sr-only">{c.done ? " : fait" : " : à faire"}</span>
                {!c.done && <span className="block text-xs">{c.hint}</span>}
              </span>
            </li>
          ))}
        </ul>
        {remaining.length === 0 && (
          <Alert tone="success" className="mt-4">
            Tous les éléments sont réunis. La publication sera ouverte avec le Mission Builder.
          </Alert>
        )}
      </Card>

      <Section id="section-fiche" locked={locked} icon="file" title="Fiche de la mission" description="Titre, secteur, métier, niveau, durée et mode de réalisation.">
        <MissionBasicsForm
          missionId={mission.id}
          mission={{
            title: mission.title,
            description: mission.description,
            sector: mission.sector,
            jobTitle: mission.jobTitle,
            level: mission.level,
            difficulty: mission.difficulty,
            durationMinutes: mission.durationMinutes,
            mode: mission.mode,
          }}
        />
      </Section>

      <Section id="section-briefing" locked={locked} icon="compass" title="Briefing immersif" description="Qui, où, quel problème, pourquoi agir, quel délai, quel résultat attendu.">
        <ScenarioForm
          missionId={mission.id}
          scenario={
            mission.scenario
              ? {
                  companyName: mission.scenario.companyName,
                  setting: mission.scenario.setting,
                  context: mission.scenario.context,
                  problem: mission.scenario.problem,
                  stakes: mission.scenario.stakes,
                  timeframe: mission.scenario.timeframe,
                  briefing: mission.scenario.briefing,
                  openingMessage: mission.scenario.openingMessage,
                }
              : null
          }
        />
      </Section>

      <Section id="section-role" locked={locked} icon="users" title="Rôle de l'apprenant" description="La position qu'il occupe dans la situation professionnelle.">
        <LearnerRoleForm
          missionId={mission.id}
          role={
            mission.learnerRole
              ? {
                  title: mission.learnerRole.title,
                  department: mission.learnerRole.department,
                  seniority: mission.learnerRole.seniority,
                  reportsTo: mission.learnerRole.reportsTo,
                  responsibilities: mission.learnerRole.responsibilities,
                }
              : null
          }
        />
      </Section>

      <Section
        id="section-contraintes" locked={locked}
        icon="wallet"
        title="Contraintes"
        description="Le moteur compare les décisions de l'apprenant à ces limites et déclenche une alerte en cas de dépassement."
      >
        <ConstraintsEditor missionId={mission.id} constraints={mission.constraints} />
      </Section>

      <Section id="section-objectifs" locked={locked} icon="target" title="Objectifs et évaluation" description="Objectifs pédagogiques, résultat attendu, mode d'évaluation et coach IA.">
        <MissionSettingsForm
          missionId={mission.id}
          objectives={formatObjectives(mission.objectivesJson)}
          expectedOutcome={mission.expectedOutcome}
          scoringMode={mission.scoringMode}
          coachEnabled={mission.coachEnabled}
        />
      </Section>

      <Section id="section-competences" locked={locked} icon="award" title="Compétences" description="Ce que l'apprenant mobilise. Le bilan de fin de mission s'appuie dessus.">
        {available.length === 0 ? (
          <Alert tone="info">
            Aucune compétence disponible. <Link href="/app/trainer/skills" className="text-accent underline-offset-4 hover:underline">Créez votre référentiel</Link> pour
            pouvoir en rattacher à cette mission.
          </Alert>
        ) : (
          <MissionSkillsForm missionId={mission.id} available={available} selectedIds={mission.skills.map((s) => s.skillId)} />
        )}
      </Section>

      <Section id="section-etapes" locked={locked} icon="layers" title="Étapes" description="Le déroulé de la mission : analyse, décisions, livrables.">
        {mission.steps.length === 0 ? (
          <Alert tone="info">Aucune étape. Le Mission Builder, qui permet de les créer et de les réorganiser, est développé en phase 5.</Alert>
        ) : (
          <ol className="space-y-2">
            {mission.steps.map((step, i) => (
              <li key={step.id} className="card-inset flex items-center gap-3 px-3 py-2.5">
                <span className="mono-num text-xs text-text-muted">{String(i + 1).padStart(2, "0")}</span>
                <span className="flex-1 text-sm">{step.title}</span>
                <Badge>{step.stepType}</Badge>
              </li>
            ))}
          </ol>
        )}
      </Section>
    </div>
  );
}
