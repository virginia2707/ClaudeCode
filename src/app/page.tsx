import Link from "next/link";
import { NavBar } from "@/components/nav-bar";
import { getCurrentUser } from "@/lib/auth";

const HOW_IT_WORKS = [
  { title: "1. Créez", text: "Le formateur définit le métier, les compétences, les missions et les situations." },
  { title: "2. Rejoignez", text: "L'apprenant rejoint la simulation avec un code d'accès et entre dans le personnage." },
  { title: "3. Décidez", text: "Chaque situation propose plusieurs choix, chacun avec des conséquences réelles." },
  { title: "4. Progressez", text: "XP, compétences, badges et niveaux évoluent au fil des décisions." },
  { title: "5. Analysez", text: "Un rapport pédagogique individuel et un tableau de bord formateur closent l'expérience." },
];

const FEATURES = [
  "Créateur de simulation en 10 étapes",
  "Situations à choix multiples avec conséquences",
  "The Coach : accompagnement IA pédagogique",
  "Compétences visualisées de 0 à 100",
  "XP, niveaux de jeu et badges",
  "Scénarios branchés selon les décisions",
  "Défis à temps limité",
  "Rapport de performance individuel",
  "Tableau de bord formateur avec statistiques",
];

const PLANS = [
  { name: "Free", price: "0€", items: ["1 simulation", "10 apprenants", "Fonctionnalités limitées"] },
  { name: "Pro", price: "sur devis", items: ["Simulations illimitées", "100 apprenants actifs", "IA & rapports"] },
  { name: "Business", price: "sur devis", items: ["Gestion d'équipe", "Statistiques avancées", "Branding, multi-formateurs"] },
  { name: "Enterprise", price: "sur devis", items: ["Fonctionnalités personnalisées", "Support dédié"] },
];

const FAQ = [
  {
    q: "Est-ce que les niveaux et compétences sont une certification ?",
    a: "Non. Il s'agit d'une évaluation pédagogique simulée, jamais d'une certification officielle ni d'un diagnostic professionnel.",
  },
  {
    q: "Le contenu généré par IA est-il publié automatiquement ?",
    a: "Jamais. Toute proposition générée par IA reste modifiable par le formateur avant publication.",
  },
  {
    q: "Puis-je utiliser The Apprentice pour l'onboarding ou la reconversion ?",
    a: "Oui — la plateforme s'adapte aux universités, centres de formation, entreprises et parcours d'onboarding ou de reconversion.",
  },
];

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <div className="flex-1">
      <NavBar user={user ? { name: user.name, role: user.role as never } : null} />

      <section className="mx-auto max-w-5xl px-6 pt-20 pb-16 text-center">
        <p className="pill mx-auto mb-6 w-fit">Simulation professionnelle gamifiée par IA</p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
          Devenez acteur de votre <span className="text-accent">formation</span>.
        </h1>
        <p className="mt-6 text-lg text-text-muted max-w-2xl mx-auto">
          The Apprentice transforme vos formations en simulations professionnelles interactives où chaque
          décision compte.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/register?role=FORMATEUR" className="btn btn-primary px-6 py-3">
            Créer une simulation
          </Link>
          <Link href="/demo" className="btn btn-ghost px-6 py-3">
            Découvrir une démo
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12">
        <h2 className="text-2xl font-semibold mb-8 text-center">Comment ça marche</h2>
        <div className="grid sm:grid-cols-5 gap-4">
          {HOW_IT_WORKS.map((s) => (
            <div key={s.title} className="card p-5">
              <div className="font-semibold text-accent mb-2">{s.title}</div>
              <p className="text-sm text-text-muted">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12 grid sm:grid-cols-3 gap-4">
        <div className="card p-6">
          <h3 className="font-semibold mb-2">Pour les formateurs</h3>
          <p className="text-sm text-text-muted">
            Créez des simulations complètes sans coder : missions, situations, choix, conséquences, feedback.
          </p>
        </div>
        <div className="card p-6">
          <h3 className="font-semibold mb-2">Pour les entreprises</h3>
          <p className="text-sm text-text-muted">
            Onboarding, reconversion, formation continue : simulez les métiers réels de votre organisation.
          </p>
        </div>
        <div className="card p-6">
          <h3 className="font-semibold mb-2">Pour les apprenants</h3>
          <p className="text-sm text-text-muted">
            Entrez dans un rôle, prenez des décisions, progressez en compétences et recevez un rapport final.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="card p-8">
          <p className="pill mb-4 w-fit">Exemple de simulation</p>
          <h3 className="text-xl font-semibold mb-2">Assistant Manager — Hôtel 4 étoiles</h3>
          <p className="text-text-muted mb-4">
            Entreprise fictive Hotel Aurora · 5 jours · Plainte client, absence d&apos;équipe, erreur de
            réservation, analyse de performance, crise opérationnelle.
          </p>
          <Link href="/demo" className="btn btn-ghost">
            Voir la simulation démo →
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12">
        <h2 className="text-2xl font-semibold mb-8 text-center">Fonctionnalités</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          {FEATURES.map((f) => (
            <div key={f} className="card-2 px-4 py-3 text-sm text-text-muted">
              {f}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12">
        <h2 className="text-2xl font-semibold mb-8 text-center">Rapports pédagogiques</h2>
        <p className="text-text-muted text-center max-w-2xl mx-auto">
          Chaque apprenant reçoit un rapport individuel (score, compétences, points forts, axes de
          progression, décisions clés). Chaque formateur consulte un tableau de bord agrégé (taux de
          complétion, score moyen, compétences maîtrisées, difficultés rencontrées). Ces analyses restent des
          évaluations pédagogiques simulées, jamais des diagnostics professionnels certifiants.
        </p>
      </section>

      <section id="tarifs" className="mx-auto max-w-5xl px-6 py-12">
        <h2 className="text-2xl font-semibold mb-8 text-center">Tarifs</h2>
        <div className="grid sm:grid-cols-4 gap-4">
          {PLANS.map((p) => (
            <div key={p.name} className="card p-6">
              <h3 className="font-semibold">{p.name}</h3>
              <p className="text-accent font-bold text-lg mb-3">{p.price}</p>
              <ul className="text-sm text-text-muted space-y-1">
                {p.items.map((i) => (
                  <li key={i}>· {i}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="text-2xl font-semibold mb-8 text-center">FAQ</h2>
        <div className="space-y-4">
          {FAQ.map((f) => (
            <div key={f.q} className="card p-5">
              <p className="font-medium mb-1">{f.q}</p>
              <p className="text-sm text-text-muted">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-text-muted">
        The Apprentice — simulation pédagogique, ne constitue pas une certification professionnelle.
      </footer>
    </div>
  );
}
