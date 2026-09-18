import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { NavBar } from "@/components/nav-bar";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { RoleValue } from "@/lib/constants";
import { levelForXP } from "@/lib/constants";
import { ProgressBar, SkillBar } from "@/components/bars";
import { DecisionForm } from "@/components/decision-form";
import { advanceAction } from "@/actions/play-actions";
import { SubmitButton } from "@/components/submit-button";

export default async function PlayPage({
  params,
  searchParams,
}: {
  params: Promise<{ progressId: string }>;
  searchParams: Promise<{ feedback?: string }>;
}) {
  const { progressId } = await params;
  const { feedback } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const progress = await prisma.progress.findUnique({
    where: { id: progressId },
    include: {
      simulation: { include: { skills: { orderBy: { order: "asc" } }, missions: { orderBy: { order: "asc" } } } },
      userSkills: { include: { skill: true } },
    },
  });
  if (!progress) notFound();
  if (progress.userId !== user.id && user.role !== "ADMIN") redirect("/apprenant");

  if (progress.status === "COMPLETED") redirect(`/play/${progressId}/report`);

  const level = levelForXP(progress.xp);
  const totalMissions = progress.simulation.missions.length;
  const currentMission = progress.currentMissionId
    ? await prisma.mission.findUnique({
        where: { id: progress.currentMissionId },
        include: { situations: { orderBy: { order: "asc" } } },
      })
    : null;
  const currentSituation = progress.currentSituationId
    ? await prisma.situation.findUnique({
        where: { id: progress.currentSituationId },
        include: { choices: { orderBy: { order: "asc" } } },
      })
    : null;

  const skillMap = new Map(progress.simulation.skills.map((s) => [s.id, s.name]));

  const feedbackChoice = feedback
    ? await prisma.choice.findUnique({
        where: { id: feedback },
        include: { consequence: true },
      })
    : null;

  return (
    <div className="flex-1">
      <NavBar user={{ name: user.name, role: user.role as RoleValue }} />
      <div className="mx-auto max-w-3xl px-6 py-8 space-y-6">
        <header className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-muted">{progress.simulation.job} · {progress.simulation.company}</p>
              <h1 className="font-semibold text-lg">{progress.simulation.title}</h1>
            </div>
            <span className="pill">Niveau {level.level} — {level.name}</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <ProgressBar value={currentMission?.dayNumber ?? totalMissions} max={totalMissions} label="Progression (jour)" />
            <ProgressBar value={progress.xp} max={level.max === Infinity ? progress.xp || 1 : level.max} label="XP" />
          </div>
          <details>
            <summary className="text-xs text-text-muted cursor-pointer">Vos compétences</summary>
            <div className="grid sm:grid-cols-2 gap-3 mt-3">
              {progress.simulation.skills.map((skill) => {
                const us = progress.userSkills.find((u) => u.skillId === skill.id);
                return <SkillBar key={skill.id} name={skill.name} score={us?.score ?? 0} />;
              })}
            </div>
          </details>
        </header>

        {feedbackChoice?.consequence ? (
          <section className="card p-6 space-y-5">
            <div>
              <p className="label mb-1">Votre décision</p>
              <p className="text-sm">{feedbackChoice.text}</p>
            </div>
            <div>
              <p className="label mb-1">Conséquence</p>
              <p className="text-sm text-text-muted">{feedbackChoice.consequence.outcomeText}</p>
            </div>
            {Object.keys(JSON.parse(feedbackChoice.consequence.skillDeltas || "{}")).length > 0 && (
              <div>
                <p className="label mb-2">Compétences mobilisées</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(JSON.parse(feedbackChoice.consequence.skillDeltas || "{}") as Record<string, number>).map(
                    ([skillId, delta]) => (
                      <span key={skillId} className="pill">
                        {skillMap.get(skillId) ?? "Compétence"} {delta > 0 ? "+" : ""}{delta}
                      </span>
                    )
                  )}
                </div>
              </div>
            )}
            <div className="card-2 p-4">
              <p className="label mb-1">Feedback du Coach</p>
              <p className="text-sm italic">« {feedbackChoice.consequence.coachFeedback} »</p>
            </div>
            <form action={advanceAction}>
              <input type="hidden" name="progressId" value={progressId} />
              <SubmitButton>Continuer →</SubmitButton>
            </form>
          </section>
        ) : currentMission && currentSituation ? (
          <section className="space-y-4">
            <div className="card-2 p-4">
              <p className="text-xs text-text-muted mb-1">
                Jour {currentMission.dayNumber} — {currentMission.title}
              </p>
              <p className="text-sm text-text-muted">Objectif : {currentMission.objective}</p>
            </div>

            <div className="card p-6">
              <h2 className="font-semibold mb-3">{currentSituation.title}</h2>
              <p className="text-sm whitespace-pre-line mb-6">{currentSituation.description}</p>

              <DecisionForm
                progressId={progressId}
                situationId={currentSituation.id}
                choices={currentSituation.choices.map((c) => ({ id: c.id, label: c.label, text: c.text }))}
                timeLimitSeconds={currentSituation.timeLimitSeconds}
              />
            </div>
          </section>
        ) : (
          <div className="card p-8 text-center text-text-muted">
            Cette simulation ne contient pas encore de situation jouable.
          </div>
        )}

        <Link href="/apprenant" className="text-sm text-text-muted block text-center">← Retour à mes simulations</Link>
      </div>
    </div>
  );
}
