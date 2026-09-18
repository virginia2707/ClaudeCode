import { ButtonLink } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { IconArrowRight, IconCheck, IconClock, IconLightbulb, IconLock, IconPlay } from "@/components/ui/icons";

function MissionPreview() {
  const steps = [
    { label: "Le fichier mystérieux", state: "done" },
    { label: "Les données cachées", state: "done" },
    { label: "L'erreur de formule", state: "current" },
    { label: "Le code final", state: "locked" },
    { label: "Mission finale", state: "locked" },
  ] as const;
  return (
    <div className="card-glow p-5 sm:p-6 animate-fade-up" aria-label="Aperçu de l'écran apprenant">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">Mission Excel</div>
          <div className="mt-0.5 font-semibold">Le reporting disparu</div>
        </div>
        <div className="flex items-center gap-2">
          <Pill tone="highlight">
            <IconClock size={14} /> 27:42
          </Pill>
          <Pill tone="accent">320 pts</Pill>
        </div>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-[1fr_1.3fr]">
        <ol className="space-y-2.5" aria-label="Progression de la mission">
          {steps.map((s, i) => (
            <li key={s.label} className="flex items-center gap-2.5 text-sm">
              <span
                className={
                  "rail-dot " + (s.state === "done" ? "rail-dot-done" : s.state === "current" ? "rail-dot-current" : "")
                }
              >
                {s.state === "done" ? <IconCheck size={13} /> : s.state === "locked" ? <IconLock size={12} /> : i + 1}
              </span>
              <span className={s.state === "locked" ? "text-text-subtle" : s.state === "current" ? "text-text font-medium" : "text-text-muted"}>
                {s.label}
              </span>
            </li>
          ))}
        </ol>

        <div className="card-2 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Étape 3 · Énigme</div>
          <p className="mt-2 text-sm text-text">
            La colonne <span className="font-mono">Total</span> affiche des montants faux. Corrigez la formule en F24 : quel est le total exact ?
          </p>
          <div className="mt-3 flex gap-2">
            <div className="input input-code flex-1 !text-base !min-h-10" aria-hidden="true">
              4 8 3 _
            </div>
            <span className="btn btn-primary btn-sm" aria-hidden="true">
              Valider
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-text-muted">
            <span className="inline-flex items-center gap-1">
              <IconLightbulb size={14} /> Indice 1 : −10 pts
            </span>
            <span>Compétence : SOMME</span>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>Progression</span>
          <span>2 / 5 étapes · 40 %</span>
        </div>
        <div className="track mt-1.5">
          <div className="track-fill" style={{ width: "40%" }} />
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 grid-bg" aria-hidden="true" />
      <div className="glow-accent -top-40 left-1/2 -translate-x-1/2" aria-hidden="true" />
      <div className="container-x relative py-16 sm:py-24 lg:py-28 grid gap-12 lg:grid-cols-2 lg:items-center">
        <div>
          <Pill tone="accent" className="mb-5">
            Formation professionnelle · Escape games pédagogiques
          </Pill>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-balance">
            Transformez vos formations en <span className="text-accent">missions</span>.
          </h1>
          <p className="mt-6 text-lg text-text-muted max-w-xl text-pretty">
            Créez des escape games pédagogiques interactifs et transformez vos cours en expériences d&apos;apprentissage
            mémorables.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <ButtonLink href="/register" size="lg">
              Créer mon Escape Game <IconArrowRight size={18} />
            </ButtonLink>
            <ButtonLink href="/demo" variant="secondary" size="lg">
              <IconPlay size={18} /> Voir la démo
            </ButtonLink>
          </div>
          <ul className="mt-8 grid gap-2 sm:grid-cols-3 text-sm text-text-muted" aria-label="Points clés">
            <li className="flex items-center gap-2">
              <IconCheck size={16} className="text-success" /> Chaque énigme = une compétence
            </li>
            <li className="flex items-center gap-2">
              <IconCheck size={16} className="text-success" /> Validation et chrono côté serveur
            </li>
            <li className="flex items-center gap-2">
              <IconCheck size={16} className="text-success" /> Prêt en 45 minutes
            </li>
          </ul>
        </div>
        <MissionPreview />
      </div>
    </section>
  );
}
