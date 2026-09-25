import type { Metadata } from "next";
import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/footer";
import { Pill } from "@/components/ui/pill";
import { ButtonLink } from "@/components/ui/button";
import { IconArrowRight, IconCheck } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Démo — Mission Excel : Le reporting disparu",
  description: "Découvrez un escape game pédagogique complet de 30 minutes sur Excel.",
};

const steps = [
  { n: 1, title: "Le fichier mystérieux", skill: "SOMME et calculs", type: "Code numérique", code: "4729" },
  { n: 2, title: "Les données cachées", skill: "Références relatives et absolues", type: "Mot secret", code: "EXCEL" },
  { n: 3, title: "L'erreur de formule", skill: "Recherche de données (RECHERCHEX)", type: "Fichier à analyser", code: "REPORTING" },
  { n: 4, title: "Le code final", skill: "Tableau croisé dynamique", type: "Code numérique", code: "8294" },
  { n: 5, title: "Mission finale", skill: "Analyse des résultats", type: "QCM", code: "—" },
];

export default function DemoPage() {
  return (
    <>
      <LandingNav />
      <main id="contenu" className="flex-1">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 grid-bg" aria-hidden="true" />
          <div className="container-x relative py-16 sm:py-20 max-w-3xl">
            <span className="eyebrow">Escape Game de démonstration</span>
            <h1 className="mt-3 text-4xl sm:text-5xl font-semibold tracking-tight">Mission Excel — Le reporting disparu</h1>
            <div className="mt-5 flex flex-wrap gap-2">
              <Pill tone="accent">30 minutes</Pill>
              <Pill>5 étapes</Pill>
              <Pill>Niveau intermédiaire</Pill>
              <Pill tone="highlight">Bureautique</Pill>
            </div>
            <blockquote className="mt-8 card-glow p-6 text-text-muted">
              « Il est 16h30. Le reporting mensuel doit être envoyé à la direction à 17h. Mais le fichier Excel contient
              plusieurs erreurs. Votre mission : identifier les anomalies, corriger les données et récupérer le code permettant
              de débloquer le fichier final. »
            </blockquote>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <ButtonLink href="/register" size="lg">
                Créer un compte pour la lancer <IconArrowRight size={18} />
              </ButtonLink>
              <ButtonLink href="/join" variant="secondary" size="lg">
                J&apos;ai un code de session
              </ButtonLink>
            </div>
            <p className="mt-4 text-xs text-text-subtle">
              La démo est installée automatiquement dans chaque nouveau compte formateur, prête à être lancée, jouée et dupliquée.
            </p>
          </div>
        </section>

        <section className="border-t border-border bg-bg-elevated py-16">
          <div className="container-x max-w-3xl">
            <h2 className="text-2xl font-semibold tracking-tight">Les 5 étapes</h2>
            <ol className="mt-6 divide-y divide-border card">
              {steps.map((s) => (
                <li key={s.n} className="flex items-center gap-4 px-5 py-4">
                  <span className="rail-dot">{s.n}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{s.title}</div>
                    <div className="text-xs text-text-muted">Compétence : {s.skill}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Pill>{s.type}</Pill>
                    <span className="code-chip text-xs" aria-label={`Code obtenu : ${s.code}`}>
                      {s.code}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
            <h2 className="mt-12 text-2xl font-semibold tracking-tight">Ce que l&apos;apprenant obtient à la fin</h2>
            <ul className="mt-4 space-y-2 text-sm text-text-muted">
              {[
                "Un score, un temps et le détail des étapes réussies.",
                "Les compétences validées et celles à retravailler.",
                "Des recommandations personnalisées et des badges éventuels.",
              ].map((t) => (
                <li key={t} className="flex gap-2">
                  <IconCheck size={16} className="mt-0.5 flex-none text-success" /> {t}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <LandingFooter />
    </>
  );
}
