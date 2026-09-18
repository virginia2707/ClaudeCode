import Link from "next/link";
import {
  Trophy,
  Timer,
  Flame,
  Users,
  Sparkles,
  BarChart3,
  ShieldCheck,
  Smartphone,
  GraduationCap,
  Building2,
  Gamepad2,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { cn, formatPoints } from "@/lib/utils";

export function Section({
  id,
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("scroll-mt-20 py-16 sm:py-20", className)}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          {eyebrow ? <div className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary-strong">{eyebrow}</div> : null}
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
          {description ? <p className="mt-3 text-base text-text-muted sm:text-lg">{description}</p> : null}
        </div>
        <div className="mt-10">{children}</div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ Hero */
export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:pb-24">
        <div className="anim-fade-up">
          <Pill tone="primary" className="mb-5">
            <Zap className="size-3.5" aria-hidden="true" /> Classement en temps réel · Bonus · Podium
          </Pill>
          <h1 className="text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Transformez vos quiz en <span className="text-gradient">compétition</span>.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-text-muted">
            QuizArena transforme vos QCM en expériences pédagogiques interactives avec classement en temps réel, défis,
            bonus et podium final.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/register" size="lg">
              Créer mon quiz
            </ButtonLink>
            <ButtonLink href="/join" size="lg" variant="secondary">
              Jouer avec un code
            </ButtonLink>
          </div>
          <p className="mt-4 text-sm text-text-faint">
            Gratuit pour démarrer. Aucun compte requis pour les apprenants.{" "}
            <Link href="/demo" className="text-primary-strong underline-offset-4 hover:underline">
              Essayer la démo
            </Link>
          </p>
        </div>
        <HeroPreview />
      </div>
    </section>
  );
}

function HeroPreview() {
  const rows = [
    { rank: 1, name: "Alex", score: 2840, delta: 0, streak: 4 },
    { rank: 2, name: "Maria", score: 2610, delta: 2, streak: 2 },
    { rank: 3, name: "Thomas", score: 2480, delta: -1, streak: 0 },
    { rank: 4, name: "Sarah", score: 2210, delta: -1, streak: 1 },
  ];
  return (
    <div className="anim-fade-up anim-delay-2 relative pb-36" aria-hidden="true">
      <div className="card p-5 shadow-[var(--shadow)]">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>Question 7 / 10</span>
          <span className="tabular-nums">Temps · 14 s</span>
        </div>
        <div className="timer-track mt-2">
          <div className="timer-fill" style={{ width: "70%" }} />
        </div>
        <p className="mt-5 text-base font-semibold">Quelle fonction Excel recherche une valeur selon une clé ?</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {[
            ["A", "SOMME", "bg-answer-a"],
            ["B", "RECHERCHEX", "bg-answer-b"],
            ["C", "NB.SI", "bg-answer-c"],
            ["D", "ARRONDI", "bg-answer-d"],
          ].map(([letter, text, color]) => (
            <div key={letter} className="card-2 flex items-center gap-2 px-3 py-2.5 text-sm">
              <span className={cn("grid size-6 shrink-0 place-items-center rounded-md text-xs font-black text-black/80", color)}>{letter}</span>
              <span className="truncate">{text}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="card anim-float absolute bottom-0 left-2 w-64 max-w-[calc(100%-1rem)] p-4 shadow-[var(--shadow)] sm:-left-6">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold text-text-muted">
          <span>Classement</span>
          <Flame className="size-4 text-spark" />
        </div>
        <ol className="space-y-1.5 text-sm">
          {rows.map((r) => (
            <li key={r.name} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <span className="w-4 text-text-faint">{r.rank}</span>
                <span className="font-medium">{r.name}</span>
                {r.streak >= 2 ? <span className="pill pill-spark">🔥 x{r.streak}</span> : null}
              </span>
              <span className="tabular-nums">
                {formatPoints(r.score)}
                <span className={cn("ml-1 text-xs", r.delta > 0 ? "text-success" : r.delta < 0 ? "text-danger" : "text-text-faint")}>
                  {r.delta > 0 ? `↑${r.delta}` : r.delta < 0 ? `↓${Math.abs(r.delta)}` : "–"}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/* --------------------------------------------------------- How it works */
export function HowItWorks() {
  const steps = [
    { icon: Sparkles, title: "Créez votre quiz", text: "Manuellement ou avec l'IA, à partir de votre contenu pédagogique. Vous relisez tout avant de publier." },
    { icon: Users, title: "Partagez un code", text: "Les apprenants rejoignent la salle d'attente avec un code à 6 caractères, sur smartphone ou ordinateur." },
    { icon: Timer, title: "Lancez la partie", text: "Les questions apparaissent simultanément. Chaque réponse rapporte des points ; la rapidité et les séries comptent." },
    { icon: Trophy, title: "Podium final", text: "Classement en temps réel, feedback pédagogique après chaque question, podium et statistiques détaillées." },
  ];
  return (
    <Section id="how" eyebrow="Comment ça marche" title="Quatre étapes, une compétition pédagogique.">
      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <li key={s.title} className="card p-5">
            <div className="flex items-center justify-between">
              <s.icon className="size-6 text-primary-strong" aria-hidden="true" />
              <span className="text-xs font-bold text-text-faint">0{i + 1}</span>
            </div>
            <h3 className="mt-4 font-semibold">{s.title}</h3>
            <p className="mt-1.5 text-sm text-text-muted">{s.text}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

/* ------------------------------------------------------------ Audiences */
export function Audiences() {
  const items = [
    {
      icon: GraduationCap,
      title: "Pour les formateurs",
      points: ["Création rapide, IA en option", "Feedback pédagogique après chaque question", "Rapport de partie et questions à retravailler"],
    },
    {
      icon: Building2,
      title: "Pour les entreprises",
      points: ["Onboarding, conformité, produit : tout devient jouable", "Mode équipe pour souder les services", "Interface sobre, adaptée à une salle de réunion"],
    },
    {
      icon: Gamepad2,
      title: "Pour les apprenants",
      points: ["Aucun compte nécessaire, un code suffit", "Jokers, séries, niveaux et badges", "Classement lisible sur mobile"],
    },
  ];
  return (
    <Section id="audiences" eyebrow="Pour qui" title="Formation professionnelle, écoles, universités, entreprises.">
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((it) => (
          <div key={it.title} className="card p-6">
            <it.icon className="size-7 text-spark" aria-hidden="true" />
            <h3 className="mt-4 text-lg font-semibold">{it.title}</h3>
            <ul className="mt-3 space-y-2 text-sm text-text-muted">
              {it.points.map((p) => (
                <li key={p} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------- Features */
export function Features() {
  const features = [
    { icon: Timer, title: "Bonus de rapidité configurable", text: "Le formateur règle le poids de la vitesse, de 0 à 100 %, pour privilégier l'exactitude." },
    { icon: Flame, title: "Séries de bonnes réponses", text: "Des bonus progressifs récompensent la régularité. Une erreur remet la série à zéro." },
    { icon: Zap, title: "Jokers", text: "50/50, Double Points, Extra Time, Second Chance — activables ou non, par quiz." },
    { icon: Users, title: "Mode individuel ou équipe", text: "Les scores des joueurs s'additionnent pour former le score d'équipe." },
    { icon: BarChart3, title: "Statistiques après la partie", text: "Taux de réussite par question, temps moyen, question la plus difficile, répartition des scores." },
    { icon: ShieldCheck, title: "Score calculé côté serveur", text: "Une seule réponse par question, expiration automatique, aucun score envoyé par le navigateur." },
    { icon: Sparkles, title: "Génération IA relue par vous", text: "L'IA propose questions, distracteurs et explications. Rien n'est publié sans validation." },
    { icon: Smartphone, title: "Mobile, tablette, projecteur", text: "Les apprenants jouent sur smartphone ; le formateur projette la partie." },
  ];
  return (
    <Section id="features" eyebrow="Fonctionnalités" title="Tout ce qu'il faut pour une partie fiable et motivante.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <div key={f.title} className="card-2 p-5">
            <f.icon className="size-5 text-primary-strong" aria-hidden="true" />
            <h3 className="mt-3 font-semibold">{f.title}</h3>
            <p className="mt-1 text-sm text-text-muted">{f.text}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* --------------------------------------------------------- Example game */
export function ExampleGame() {
  return (
    <Section id="example" eyebrow="Exemple de partie" title="Un feedback clair après chaque question.">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-text-faint">Feedback apprenant</div>
          <div className="mt-3 text-2xl font-bold text-success">Bonne réponse !</div>
          <dl className="mt-4 space-y-1.5 text-sm">
            <Row k="Réponse correcte" v="+500" />
            <Row k="Bonus rapidité" v="+320" />
            <Row k="Série x3" v="+100" />
            <div className="border-t border-border pt-2">
              <Row k="Total" v="+920" strong />
            </div>
          </dl>
          <p className="mt-4 text-sm text-text-muted">
            « RECHERCHEX permet de rechercher une valeur dans une plage et de renvoyer une valeur correspondante. »
          </p>
        </div>
        <div className="card p-6 lg:col-span-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-text-faint">Podium final</div>
          <div className="mt-6 grid grid-cols-3 items-end gap-3">
            {[
              { place: "🥈", name: "Paul", xp: 1620, h: "h-24" },
              { place: "🥇", name: "Virginia", xp: 1850, h: "h-32" },
              { place: "🥉", name: "Sarah", xp: 1410, h: "h-20" },
            ].map((p) => (
              <div key={p.name} className="text-center">
                <div className="text-2xl" aria-hidden="true">
                  {p.place}
                </div>
                <div className="mt-1 font-semibold">{p.name}</div>
                <div className="text-sm tabular-nums text-text-muted">{formatPoints(p.xp)} XP</div>
                <div className={cn("mt-2 rounded-t-xl bg-[linear-gradient(180deg,var(--primary-soft),transparent)] border border-b-0 border-border", p.h)} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between", strong && "text-base font-bold")}>
      <dt className={strong ? "" : "text-text-muted"}>{k}</dt>
      <dd className={cn("tabular-nums", strong ? "text-spark" : "")}>{v}</dd>
    </div>
  );
}

/* ---------------------------------------------------------------- Stats */
export function Stats() {
  const stats = [
    { label: "Temps de mise en place", value: "< 5 min", hint: "de la création du quiz au lancement" },
    { label: "Réponses validées", value: "100 %", hint: "côté serveur, horodatées" },
    { label: "Modes de jeu", value: "2", hint: "individuel et équipe" },
    { label: "Jokers", value: "4", hint: "activables par quiz" },
  ];
  return (
    <Section id="stats" eyebrow="En chiffres" title="Conçu pour la fiabilité avant le spectacle.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card-2 p-5">
            <div className="text-3xl font-black text-gradient">{s.value}</div>
            <div className="mt-1 font-semibold">{s.label}</div>
            <div className="text-sm text-text-muted">{s.hint}</div>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------- Pricing */
export function Pricing() {
  const plans = [
    { name: "Free", price: "0 €", tag: "Pour essayer", features: ["3 quiz", "25 participants par partie", "Fonctionnalités essentielles", "Podium et classement"] },
    { name: "Pro", price: "Bientôt", tag: "Formateurs", highlight: true, features: ["Quiz illimités", "200 participants", "Génération IA", "Statistiques avancées", "Mode équipe", "Personnalisation"] },
    { name: "Business", price: "Bientôt", tag: "Organismes", features: ["Plusieurs formateurs", "Branding", "Gestion d'organisation", "Statistiques avancées"] },
    { name: "Enterprise", price: "Sur devis", tag: "Grands comptes", features: ["Fonctionnalités personnalisées", "Support dédié", "SSO (à venir)"] },
  ];
  return (
    <Section id="pricing" eyebrow="Tarifs" title="Commencez gratuitement, évoluez quand vous en avez besoin." description="La facturation n'est pas encore activée : tous les comptes créés pendant le MVP sont sur le plan Free.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((p) => (
          <div key={p.name} className={cn("card flex flex-col p-6", p.highlight && "border-primary shadow-[0_0_0_1px_var(--primary)]")}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">{p.name}</h3>
              <Pill tone={p.highlight ? "primary" : "neutral"}>{p.tag}</Pill>
            </div>
            <div className="mt-3 text-3xl font-black">{p.price}</div>
            <ul className="mt-4 flex-1 space-y-2 text-sm text-text-muted">
              {p.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
            <ButtonLink href="/register" variant={p.highlight ? "primary" : "secondary"} className="mt-6">
              {p.name === "Free" ? "Créer un compte" : "Être prévenu"}
            </ButtonLink>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ FAQ */
export function Faq() {
  const items = [
    { q: "Les apprenants doivent-ils créer un compte ?", a: "Non. Un code de partie et un pseudo suffisent. Un compte permet seulement de conserver XP, niveaux et badges d'une partie à l'autre." },
    { q: "La vitesse ne risque-t-elle pas de pénaliser la réflexion ?", a: "Le formateur règle le poids de la rapidité (jusqu'à 0 %). Une mauvaise réponse ne retire jamais de points sauf si une pénalité est explicitement activée." },
    { q: "Que se passe-t-il si un apprenant perd sa connexion ?", a: "Son score et sa progression sont conservés côté serveur. À la reconnexion, l'état de la partie est resynchronisé et une double réponse est impossible." },
    { q: "Les questions générées par l'IA sont-elles publiées automatiquement ?", a: "Jamais. Elles sont proposées en brouillon, toujours modifiables et vérifiables par le formateur avant publication." },
    { q: "Puis-je projeter la partie ?", a: "Oui. L'écran formateur est conçu pour un vidéoprojecteur : question, temps restant, répartition des réponses et classement." },
  ];
  return (
    <Section id="faq" eyebrow="FAQ" title="Questions fréquentes">
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((it) => (
          <details key={it.q} className="card group p-5">
            <summary className="cursor-pointer list-none font-semibold marker:content-none">
              <span className="flex items-center justify-between gap-3">
                {it.q}
                <span className="text-text-faint transition group-open:rotate-45" aria-hidden="true">
                  +
                </span>
              </span>
            </summary>
            <p className="mt-3 text-sm text-text-muted">{it.a}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------- Final CTA */
export function FinalCta() {
  return (
    <section className="py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="card relative overflow-hidden p-8 text-center sm:p-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(40rem_16rem_at_50%_-20%,rgba(124,108,255,0.28),transparent)]" />
          <h2 className="relative text-3xl font-black tracking-tight sm:text-4xl">Prêt à entrer dans l&apos;arène ?</h2>
          <p className="relative mx-auto mt-3 max-w-xl text-text-muted">
            Créez votre premier quiz en quelques minutes et lancez une partie avec vos apprenants.
          </p>
          <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/register" size="lg">
              Créer mon quiz
            </ButtonLink>
            <ButtonLink href="/join" size="lg" variant="secondary">
              Jouer avec un code
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
