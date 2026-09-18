import type { Metadata } from "next";
import { DecisionPreview } from "@/components/demo/decision-preview";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icons";
import { ProgressBar, SkillList } from "@/components/ui/progress";
import { LAUNCH_48H_PREVIEW as M } from "@/lib/demo/launch-48h-preview";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = {
  title: "Mission démo — 48 heures pour lancer le produit",
  description: "Aperçu de l'écran apprenant MissionIA : briefing, contraintes, étape courante, ressources, décision et conséquences.",
};

const STEP_STATE = {
  done: { label: "terminée", className: "text-success", glyph: "✓" },
  current: { label: "en cours", className: "text-accent", glyph: "●" },
  locked: { label: "verrouillée", className: "text-text-muted", glyph: "○" },
} as const;

export default function DemoPage() {
  const done = M.steps.filter((s) => s.state === "done").length;
  const progress = Math.round((done / M.steps.length) * 100);

  return (
    <main id="contenu" className="flex-1">
      {/* Barre de mission : Où suis-je ? */}
      <div className="border-b border-border bg-bg-elevated">
        <div className="container-x flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">Aperçu</Badge>
            <p className="font-semibold">{M.title}</p>
            <Badge>{M.sector}</Badge>
          </div>
          <div className="flex items-center gap-4 text-xs text-text-muted">
            <span className="flex items-center gap-1.5">
              <Icon name="clock" className="h-3.5 w-3.5" />
              <span className="mono-num">41 min</span> restantes
            </span>
            <span className="mono-num">Étape 3 / 5</span>
          </div>
        </div>
      </div>

      <div className="container-x py-6">
        <Alert tone="info" className="mb-6">
          Cet aperçu est statique et interactif localement : il montre la structure de l&apos;écran apprenant. La mission complète (données, tâches,
          livrables, évaluation) est développée dans les phases suivantes.
        </Alert>

        <div className="grid gap-6 lg:grid-cols-[18rem_1fr_17rem]">
          {/* Colonne gauche : mission, rôle, contexte, objectif, contraintes */}
          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start" aria-label="Contexte de la mission">
            <Card className="p-4">
              <p className="text-xs uppercase tracking-wider text-text-muted">Votre rôle</p>
              <p className="mt-1 font-semibold">{M.role}</p>
              <p className="text-sm text-text-muted">{M.company}</p>
              <div className="divider my-4" />
              <p className="text-xs uppercase tracking-wider text-text-muted">Objectif</p>
              <p className="mt-1 text-sm text-text-secondary">{M.objective}</p>
              <div className="divider my-4" />
              <p className="text-xs uppercase tracking-wider text-text-muted">Contraintes</p>
              <dl className="mt-2 space-y-2">
                {M.constraints.map((c) => (
                  <div key={c.key} className="flex items-center justify-between text-sm">
                    <dt className="text-text-secondary">{c.label}</dt>
                    <dd className="mono-num font-semibold text-signal">{c.value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
            <Card className="p-4">
              <p className="text-xs uppercase tracking-wider text-text-muted">Briefing</p>
              <p className="mt-2 text-sm text-text-secondary">{M.briefing}</p>
            </Card>
          </aside>

          {/* Colonne centrale : étape courante, action attendue */}
          <section aria-labelledby="etape-titre" className="space-y-5">
            <Card variant="elevated" className="p-5 sm:p-7">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="accent">Étape 3</Badge>
                <Badge>Décision</Badge>
                <Badge>≈ 10 min</Badge>
              </div>
              <h1 id="etape-titre" className="h1 mt-3">
                {M.currentStep.title}
              </h1>
              <p className="mt-2 text-text-secondary">{M.currentStep.objective}</p>

              <div className="card-inset mt-6 p-4">
                <p className="text-xs uppercase tracking-wider text-text-muted">Nouveau contexte</p>
                <p className="mt-1.5 text-sm text-text-secondary">{M.currentStep.context}</p>
              </div>

              <div className="mt-6">
                <p className="text-xs uppercase tracking-wider text-text-muted">Action attendue</p>
                <p className="mt-1.5 text-sm">{M.currentStep.instruction}</p>
              </div>

              <div className="divider my-6" />
              <DecisionPreview decision={M.decision} />
            </Card>

            <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <Icon name="message" />
                </span>
                <div>
                  <p className="text-sm font-semibold">Coach IA</p>
                  <p className="text-xs text-text-muted">« Quels éléments dois-je analyser ? » · 5 niveaux d&apos;aide, jamais la solution d&apos;emblée.</p>
                </div>
              </div>
              <Badge>Activé par le formateur · phase 17</Badge>
            </Card>
          </section>

          {/* Colonne droite : progression, étapes, ressources, compétences */}
          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start" aria-label="Progression et ressources">
            <Card className="p-4">
              <p className="text-xs uppercase tracking-wider text-text-muted">Progression</p>
              <ProgressBar className="mt-2" value={progress} label="Progression de la mission" />
              <ol className="mt-4 space-y-2">
                {M.steps.map((s, i) => {
                  const st = STEP_STATE[s.state];
                  return (
                    <li key={s.key} className={cn("flex items-center gap-2 text-sm", s.state === "current" && "font-semibold")}>
                      <span aria-hidden="true" className={cn("mono-num w-4 text-center", st.className)}>
                        {st.glyph}
                      </span>
                      <span className={s.state === "locked" ? "text-text-muted" : undefined}>
                        {i + 1}. {s.title}
                      </span>
                      <span className="sr-only">, {st.label}</span>
                    </li>
                  );
                })}
              </ol>
            </Card>
            <Card className="p-4">
              <p className="text-xs uppercase tracking-wider text-text-muted">Ressources</p>
              <ul className="mt-2 space-y-2">
                {M.currentStep.resources.map((r) => (
                  <li key={r.title} className="flex items-start gap-2 text-sm">
                    <Icon name="file" className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
                    <span className="flex-1">
                      <span className={r.viewed ? "text-text-secondary" : "text-text"}>{r.title}</span>
                      <span className="mt-0.5 flex gap-1.5">
                        {r.required && <Badge tone="signal">obligatoire</Badge>}
                        {r.viewed && <Badge tone="success">consultée</Badge>}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="p-4">
              <p className="text-xs uppercase tracking-wider text-text-muted">Compétences</p>
              <SkillList className="mt-2" skills={M.skills} />
            </Card>
          </aside>
        </div>
      </div>
    </main>
  );
}
