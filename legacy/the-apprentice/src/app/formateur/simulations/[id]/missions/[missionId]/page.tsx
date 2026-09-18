import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { NavBar } from "@/components/nav-bar";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { RoleValue } from "@/lib/constants";
import { DEFAULT_VARIABLES, DIFFICULTIES, VARIABLE_LABELS } from "@/lib/constants";
import { SubmitButton } from "@/components/submit-button";
import {
  createChoiceAction,
  createSituationAction,
  deleteChoiceAction,
  deleteSituationAction,
  upsertConsequenceAction,
} from "@/actions/simulation-actions";

const DIFFICULTY_LABEL: Record<string, string> = {
  EASY: "Facile",
  MEDIUM: "Moyen",
  HARD: "Difficile",
  EXPERT: "Expert",
};

export default async function MissionEditorPage({
  params,
}: {
  params: Promise<{ id: string; missionId: string }>;
}) {
  const { id: simulationId, missionId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "FORMATEUR" && user.role !== "ADMIN") redirect("/dashboard");

  const simulation = await prisma.simulation.findUnique({
    where: { id: simulationId },
    include: { skills: { orderBy: { order: "asc" } } },
  });
  if (!simulation) notFound();
  if (user.role !== "ADMIN" && simulation.createdById !== user.id) redirect("/formateur");

  const mission = await prisma.mission.findUnique({
    where: { id: missionId },
    include: {
      situations: {
        orderBy: { order: "asc" },
        include: { choices: { orderBy: { order: "asc" }, include: { consequence: true } } },
      },
    },
  });
  if (!mission || mission.simulationId !== simulationId) notFound();

  const allSituations = mission.situations;

  return (
    <div className="flex-1">
      <NavBar user={{ name: user.name, role: user.role as RoleValue }} />
      <div className="mx-auto max-w-4xl px-6 py-10 space-y-8">
        <div>
          <Link href={`/formateur/simulations/${simulationId}`} className="text-sm text-text-muted">← {simulation.title}</Link>
          <h1 className="text-2xl font-semibold mt-2">Jour {mission.dayNumber} · {mission.title}</h1>
          <p className="text-text-muted text-sm mt-1">{mission.objective}</p>
        </div>

        <p className="pill w-fit">Étapes 5–8 · Situations, choix, conséquences, feedback</p>

        {allSituations.map((situation, sIdx) => (
          <section key={situation.id} className="card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-text-muted mb-1">Situation {sIdx + 1} · {DIFFICULTY_LABEL[situation.difficulty]}{situation.timeLimitSeconds ? ` · ${situation.timeLimitSeconds}s` : ""}</p>
                <h2 className="font-semibold">{situation.title}</h2>
                <p className="text-sm text-text-muted mt-1 whitespace-pre-line">{situation.description}</p>
              </div>
              <form action={deleteSituationAction.bind(null, simulationId, missionId, situation.id)}>
                <button className="btn btn-ghost text-danger text-xs">Supprimer</button>
              </form>
            </div>

            <div className="space-y-3">
              {situation.choices.map((choice) => (
                <div key={choice.id} className="card-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm">
                      <span className="font-semibold text-accent">{choice.label} —</span> {choice.text}
                    </p>
                    <form action={deleteChoiceAction.bind(null, simulationId, missionId, choice.id)}>
                      <button className="btn btn-ghost text-danger text-xs shrink-0">✕</button>
                    </form>
                  </div>

                  <details className="mt-3" open={!choice.consequence}>
                    <summary className="cursor-pointer text-xs text-text-muted">
                      {choice.consequence ? "Modifier la conséquence" : "⚠ Définir la conséquence (requis)"}
                    </summary>
                    <form action={upsertConsequenceAction.bind(null, simulationId, missionId, choice.id)} className="space-y-3 mt-3">
                      <div>
                        <label className="label">Ce qui se passe (visible par l&apos;apprenant)</label>
                        <textarea className="input" name="outcomeText" rows={2} defaultValue={choice.consequence?.outcomeText} required />
                      </div>
                      <div>
                        <label className="label">Feedback du Coach</label>
                        <textarea className="input" name="coachFeedback" rows={2} defaultValue={choice.consequence?.coachFeedback} required />
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                          <label className="label">XP octroyé</label>
                          <input
                            className="input"
                            name="xpAward"
                            type="number"
                            defaultValue={choice.consequence?.xpAward ?? 0}
                          />
                        </div>
                        <div>
                          <label className="label">Situation suivante (branchement, optionnel)</label>
                          <select className="input" name="nextSituationId" defaultValue={choice.consequence?.nextSituationId ?? ""}>
                            <option value="">Suivante par défaut</option>
                            {allSituations
                              .filter((s) => s.id !== situation.id)
                              .map((s, i) => (
                                <option key={s.id} value={s.id}>
                                  Situation {i + 1} — {s.title}
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <p className="label mb-2">Variables impactées</p>
                        <div className="grid sm:grid-cols-2 gap-2">
                          {DEFAULT_VARIABLES.map((v) => {
                            const deltas: Record<string, number> = choice.consequence
                              ? JSON.parse(choice.consequence.variableDeltas || "{}")
                              : {};
                            return (
                              <div key={v} className="flex items-center gap-2">
                                <label className="text-xs text-text-muted flex-1">{VARIABLE_LABELS[v]}</label>
                                <input
                                  className="input w-20"
                                  type="number"
                                  name={`var_${v}`}
                                  defaultValue={deltas[v] ?? 0}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {simulation.skills.length > 0 && (
                        <div>
                          <p className="label mb-2">Compétences mobilisées</p>
                          <div className="grid sm:grid-cols-2 gap-2">
                            {simulation.skills.map((skill) => {
                              const skillDeltas: Record<string, number> = choice.consequence
                                ? JSON.parse(choice.consequence.skillDeltas || "{}")
                                : {};
                              return (
                                <div key={skill.id} className="flex items-center gap-2">
                                  <input type="hidden" name="skillId" value={skill.id} />
                                  <label className="text-xs text-text-muted flex-1">{skill.name}</label>
                                  <input
                                    className="input w-20"
                                    type="number"
                                    name={`skillDelta_${skill.id}`}
                                    defaultValue={skillDeltas[skill.id] ?? 0}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <SubmitButton className="btn btn-ghost text-sm">Enregistrer la conséquence</SubmitButton>
                    </form>
                  </details>
                </div>
              ))}

              {situation.choices.length < 5 && (
                <form action={createChoiceAction.bind(null, simulationId, missionId, situation.id)} className="flex gap-2">
                  <input className="input" name="text" placeholder="Texte du nouveau choix" required />
                  <SubmitButton className="btn btn-ghost text-sm">+ Choix</SubmitButton>
                </form>
              )}
            </div>
          </section>
        ))}

        <details className="card p-6">
          <summary className="cursor-pointer font-medium">+ Ajouter une situation</summary>
          <form action={createSituationAction.bind(null, simulationId, missionId)} className="space-y-3 mt-4">
            <div>
              <label className="label">Titre</label>
              <input className="input" name="title" required placeholder="Un client se plaint à la réception" />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input" name="description" rows={4} required placeholder="Il est 14h30. Un client vient à la réception..." />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Difficulté</label>
                <select className="input" name="difficulty" defaultValue="MEDIUM">
                  {DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>{DIFFICULTY_LABEL[d]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Temps limite (secondes, optionnel)</label>
                <input className="input" name="timeLimitSeconds" type="number" placeholder="Aucune limite" />
              </div>
            </div>
            <SubmitButton>Créer la situation →</SubmitButton>
          </form>
        </details>
      </div>
    </div>
  );
}
