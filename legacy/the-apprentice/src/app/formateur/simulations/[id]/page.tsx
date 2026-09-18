import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { NavBar } from "@/components/nav-bar";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { RoleValue } from "@/lib/constants";
import { DIFFICULTIES } from "@/lib/constants";
import { SubmitButton } from "@/components/submit-button";
import {
  addSkillAction,
  createBadgeAction,
  createMissionAction,
  deleteBadgeAction,
  deleteMissionAction,
  deleteSkillAction,
  generateWithAIAction,
  publishSimulationAction,
  unpublishSimulationAction,
  updateSimulationDetailsAction,
} from "@/actions/simulation-actions";

const DIFFICULTY_LABEL: Record<string, string> = {
  EASY: "Facile",
  MEDIUM: "Moyen",
  HARD: "Difficile",
  EXPERT: "Expert",
};

export default async function SimulationEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "FORMATEUR" && user.role !== "ADMIN") redirect("/dashboard");

  const simulation = await prisma.simulation.findUnique({
    where: { id },
    include: {
      skills: { orderBy: { order: "asc" } },
      badges: true,
      missions: {
        orderBy: { order: "asc" },
        include: { _count: { select: { situations: true } } },
      },
      _count: { select: { progresses: true } },
    },
  });
  if (!simulation) notFound();
  if (user.role !== "ADMIN" && simulation.createdById !== user.id) redirect("/formateur");

  const joinUrl = simulation.accessCode ? `/apprenant?code=${simulation.accessCode}` : null;

  return (
    <div className="flex-1">
      <NavBar user={{ name: user.name, role: user.role as RoleValue }} />
      <div className="mx-auto max-w-5xl px-6 py-10 space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="pill w-fit mb-2">{simulation.status === "PUBLISHED" ? "Publiée" : "Brouillon"}</p>
            <h1 className="text-2xl font-semibold">{simulation.title}</h1>
            <p className="text-text-muted text-sm mt-1">{simulation.job} · {simulation.company}</p>
          </div>
          <div className="flex gap-2">
            <Link href={`/formateur/simulations/${simulation.id}/stats`} className="btn btn-ghost">
              Statistiques
            </Link>
            {simulation.status === "PUBLISHED" ? (
              <form action={unpublishSimulationAction.bind(null, simulation.id)}>
                <SubmitButton className="btn btn-ghost">Repasser en brouillon</SubmitButton>
              </form>
            ) : (
              <form action={publishSimulationAction.bind(null, simulation.id)}>
                <SubmitButton className="btn btn-primary">Publier →</SubmitButton>
              </form>
            )}
          </div>
        </div>

        {simulation.accessCode && (
          <div className="card p-4 flex items-center justify-between">
            <div>
              <p className="label mb-1">Code d&apos;accès apprenant</p>
              <p className="text-lg font-mono text-accent">{simulation.accessCode}</p>
            </div>
            {joinUrl && <span className="text-sm text-text-muted">{simulation._count.progresses} apprenant(s) inscrit(s)</span>}
          </div>
        )}

        {/* Étape 2 — Contexte */}
        <section className="card p-6">
          <p className="pill w-fit mb-3">Étape 2 · Contexte</p>
          <form action={updateSimulationDetailsAction.bind(null, simulation.id)} className="space-y-4">
            <div>
              <label className="label" htmlFor="title">Titre</label>
              <input className="input" id="title" name="title" defaultValue={simulation.title} required />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="job">Métier</label>
                <input className="input" id="job" name="job" defaultValue={simulation.job} required />
              </div>
              <div>
                <label className="label" htmlFor="company">Entreprise fictive</label>
                <input className="input" id="company" name="company" defaultValue={simulation.company} required />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="context">Contexte</label>
              <textarea className="input" id="context" name="context" rows={3} defaultValue={simulation.context} />
            </div>
            <div>
              <label className="label" htmlFor="description">Description apprenant</label>
              <textarea className="input" id="description" name="description" rows={3} defaultValue={simulation.description} />
            </div>
            <div className="sm:w-48">
              <label className="label" htmlFor="durationDays">Durée (jours)</label>
              <input className="input" id="durationDays" name="durationDays" type="number" min={1} max={30} defaultValue={simulation.durationDays} />
            </div>
            <SubmitButton className="btn btn-ghost">Enregistrer</SubmitButton>
          </form>
        </section>

        {/* Étape 3 — Compétences */}
        <section className="card p-6">
          <p className="pill w-fit mb-3">Étape 3 · Compétences</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {simulation.skills.map((skill) => (
              <form key={skill.id} action={deleteSkillAction.bind(null, simulation.id, skill.id)}>
                <button className="pill hover:border-danger hover:text-danger" title="Supprimer">
                  {skill.name} ✕
                </button>
              </form>
            ))}
            {simulation.skills.length === 0 && <p className="text-text-muted text-sm">Aucune compétence pour le moment.</p>}
          </div>
          <form action={addSkillAction.bind(null, simulation.id)} className="flex gap-2">
            <input className="input" name="name" placeholder="Ex. Communication" required />
            <SubmitButton className="btn btn-ghost">Ajouter</SubmitButton>
          </form>
        </section>

        {/* Étape 4 — Missions */}
        <section className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="pill w-fit">Étape 4 · Missions / journées</p>
            <form action={generateWithAIAction.bind(null, simulation.id)} className="flex items-center gap-2">
              <select name="level" className="input text-xs py-1" defaultValue="Débutant">
                <option>Débutant</option>
                <option>Intermédiaire</option>
                <option>Avancé</option>
              </select>
              <SubmitButton className="btn btn-ghost text-xs" pendingText="Génération…">
                ✨ Créer avec IA
              </SubmitButton>
            </form>
          </div>

          <div className="space-y-2 mb-4">
            {simulation.missions.map((mission) => (
              <div key={mission.id} className="card-2 p-4 flex items-center justify-between">
                <Link href={`/formateur/simulations/${simulation.id}/missions/${mission.id}`} className="flex-1">
                  <p className="font-medium">Jour {mission.dayNumber} · {mission.title}</p>
                  <p className="text-xs text-text-muted mt-1">
                    {mission._count.situations} situation(s) · {DIFFICULTY_LABEL[mission.difficulty]} · {mission.xpAvailable} XP
                  </p>
                </Link>
                <form action={deleteMissionAction.bind(null, simulation.id, mission.id)}>
                  <button className="btn btn-ghost text-danger text-xs">Supprimer</button>
                </form>
              </div>
            ))}
            {simulation.missions.length === 0 && (
              <p className="text-text-muted text-sm">Aucune mission. Ajoutez-en une ci-dessous ou générez-en avec l&apos;IA.</p>
            )}
          </div>

          <details className="card-2 p-4">
            <summary className="cursor-pointer text-sm font-medium">+ Ajouter une mission manuellement</summary>
            <form action={createMissionAction.bind(null, simulation.id)} className="space-y-3 mt-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="dayNumber">Jour</label>
                  <input className="input" id="dayNumber" name="dayNumber" type="number" min={1} defaultValue={simulation.missions.length + 1} />
                </div>
                <div>
                  <label className="label" htmlFor="difficulty">Difficulté</label>
                  <select className="input" id="difficulty" name="difficulty" defaultValue="MEDIUM">
                    {DIFFICULTIES.map((d) => (
                      <option key={d} value={d}>{DIFFICULTY_LABEL[d]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="label" htmlFor="mtitle">Titre</label>
                <input className="input" id="mtitle" name="title" required placeholder="Une équipe sous pression" />
              </div>
              <div>
                <label className="label" htmlFor="mdescription">Description</label>
                <textarea className="input" id="mdescription" name="description" rows={2} />
              </div>
              <div>
                <label className="label" htmlFor="mcontext">Contexte</label>
                <textarea className="input" id="mcontext" name="context" rows={2} />
              </div>
              <div>
                <label className="label" htmlFor="mobjective">Objectif</label>
                <input className="input" id="mobjective" name="objective" />
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="label" htmlFor="estimatedDurationMinutes">Durée (min)</label>
                  <input className="input" id="estimatedDurationMinutes" name="estimatedDurationMinutes" type="number" defaultValue={15} />
                </div>
                <div>
                  <label className="label" htmlFor="xpAvailable">XP disponible</label>
                  <input className="input" id="xpAvailable" name="xpAvailable" type="number" defaultValue={150} />
                </div>
                <div>
                  <label className="label" htmlFor="maxScore">Score max</label>
                  <input className="input" id="maxScore" name="maxScore" type="number" defaultValue={100} />
                </div>
              </div>
              <SubmitButton>Créer la mission →</SubmitButton>
            </form>
          </details>
        </section>

        {/* Badges */}
        <section className="card p-6">
          <p className="pill w-fit mb-3">Badges</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {simulation.badges.map((b) => (
              <form key={b.id} action={deleteBadgeAction.bind(null, simulation.id, b.id)}>
                <button className="pill hover:border-danger hover:text-danger" title="Supprimer">
                  {b.icon} {b.name} ✕
                </button>
              </form>
            ))}
            {simulation.badges.length === 0 && <p className="text-text-muted text-sm">Aucun badge configuré.</p>}
          </div>
          <details className="card-2 p-4">
            <summary className="cursor-pointer text-sm font-medium">+ Ajouter un badge</summary>
            <form action={createBadgeAction.bind(null, simulation.id)} className="space-y-3 mt-4">
              <div className="grid sm:grid-cols-3 gap-3">
                <input className="input" name="icon" placeholder="🏅" defaultValue="🏅" />
                <input className="input" name="code" placeholder="code_unique" required />
                <input className="input" name="name" placeholder="Nom du badge" required />
              </div>
              <textarea className="input" name="description" rows={2} placeholder="Description" />
              <div className="grid sm:grid-cols-2 gap-3">
                <select className="input" name="criteriaType" defaultValue="first_decision">
                  <option value="first_decision">Première décision</option>
                  <option value="first_mission">Première mission</option>
                  <option value="mission_complete">Mission terminée</option>
                  <option value="perfect_mission">Mission parfaite</option>
                  <option value="simulation_complete">Simulation terminée</option>
                  <option value="skill_threshold">Seuil de compétence</option>
                  <option value="fast_decision">Décision rapide</option>
                </select>
                <input className="input" name="criteriaValue" placeholder="Paramètre (ex. 2, Communication:80, 10s)" />
              </div>
              <SubmitButton>Ajouter le badge</SubmitButton>
            </form>
          </details>
        </section>
      </div>
    </div>
  );
}
