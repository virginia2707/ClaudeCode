import { redirect } from "next/navigation";
import { NavBar } from "@/components/nav-bar";
import { getCurrentUser } from "@/lib/auth";
import { createSimulationAction } from "@/actions/simulation-actions";
import { SubmitButton } from "@/components/submit-button";
import type { RoleValue } from "@/lib/constants";

export default async function NewSimulationPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "FORMATEUR" && user.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="flex-1">
      <NavBar user={{ name: user.name, role: user.role as RoleValue }} />
      <div className="mx-auto max-w-2xl px-6 py-10">
        <p className="pill w-fit mb-3">Étape 1 · Métier &amp; contexte</p>
        <h1 className="text-2xl font-semibold mb-1">Créer une simulation</h1>
        <p className="text-text-muted text-sm mb-8">
          Vous pourrez ajouter les compétences, missions, situations et conséquences dans l&apos;éditeur
          juste après.
        </p>

        <form action={createSimulationAction} className="card p-6 space-y-4">
          <div>
            <label className="label" htmlFor="title">
              Titre de la simulation
            </label>
            <input className="input" id="title" name="title" required placeholder="Assistant Manager — Hôtel 4 étoiles" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="job">
                Métier
              </label>
              <input className="input" id="job" name="job" required placeholder="Assistant Manager Hôtel" />
            </div>
            <div>
              <label className="label" htmlFor="company">
                Entreprise fictive
              </label>
              <input className="input" id="company" name="company" required placeholder="Hotel Aurora" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="context">
              Contexte
            </label>
            <textarea className="input" id="context" name="context" rows={3} placeholder="Hôtel 4 étoiles international, forte affluence, clientèle exigeante." />
          </div>
          <div>
            <label className="label" htmlFor="description">
              Description (visible par l&apos;apprenant)
            </label>
            <textarea className="input" id="description" name="description" rows={3} />
          </div>
          <div>
            <label className="label" htmlFor="durationDays">
              Durée (jours / missions)
            </label>
            <input className="input" id="durationDays" name="durationDays" type="number" min={1} max={30} defaultValue={5} />
          </div>

          <SubmitButton>Créer et continuer →</SubmitButton>
        </form>
      </div>
    </div>
  );
}
