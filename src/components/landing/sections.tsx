import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { Pill } from "@/components/ui/pill";
import { ButtonLink } from "@/components/ui/button";
import {
  IconArrowRight,
  IconBuilding,
  IconChart,
  IconCheck,
  IconClock,
  IconFile,
  IconGrid,
  IconLayers,
  IconLightbulb,
  IconLock,
  IconQr,
  IconRefresh,
  IconShield,
  IconSparkles,
  IconTarget,
  IconTrophy,
  IconUsers,
} from "@/components/ui/icons";

/* ---------------------------------------------------------------- Comment ça marche */
export function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Partez de votre cours",
      text: "Un objectif pédagogique, quelques compétences à travailler. Le contenu que vous avez déjà suffit.",
    },
    {
      n: "02",
      title: "Écrivez le scénario",
      text: "Une situation professionnelle crédible : un reporting à envoyer, un audit à préparer, un client à rappeler.",
    },
    {
      n: "03",
      title: "Créez les énigmes",
      text: "Chaque étape pose un problème réel. La bonne réponse délivre un code qui débloque la suite.",
    },
    {
      n: "04",
      title: "Lancez la session",
      text: "Un code, un QR code. Vos apprenants rejoignent depuis leur téléphone ou leur poste en 10 secondes.",
    },
    {
      n: "05",
      title: "Analysez les compétences",
      text: "Score, temps, indices, erreurs : vous voyez précisément quelle compétence bloque et pour qui.",
    },
  ];
  return (
    <section id="comment-ca-marche" className="py-20 sm:py-24 scroll-mt-16">
      <div className="container-x">
        <SectionHeading
          eyebrow="Comment ça marche"
          title="De « j'ai un cours de 2 heures » à « je lance une mission de 45 minutes »"
          description="COURSE → SCÉNARIO → ÉNIGMES → INDICES → CODES → PROGRESSION → MISSION FINALE → ÉVALUATION."
        />
        <ol className="mt-12 grid gap-4 md:grid-cols-5">
          {steps.map((s) => (
            <li key={s.n} className="card p-5 flex flex-col">
              <span className="font-mono text-xs font-bold text-accent">{s.n}</span>
              <h3 className="mt-2 font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Pourquoi */
export function Why() {
  const items = [
    {
      icon: IconTarget,
      title: "Pédagogie avant divertissement",
      text: "Chaque énigme est reliée à une compétence. Le rapport final dit ce qui est acquis et ce qui ne l'est pas.",
    },
    {
      icon: IconShield,
      title: "Fiabilité avant animations",
      text: "Réponses, score, temps et déblocages sont calculés sur le serveur. Aucun résultat ne dépend du navigateur.",
    },
    {
      icon: IconGrid,
      title: "Simplicité avant complexité",
      text: "Un assistant de création, une prévisualisation, un bouton « Lancer une session ». Rien à installer.",
    },
    {
      icon: IconUsers,
      title: "Conçu pour des adultes",
      text: "Une esthétique sobre et professionnelle, une consigne toujours claire, une expérience optimisée sur mobile.",
    },
  ];
  return (
    <section id="pourquoi" className="py-20 sm:py-24 border-t border-border bg-bg-elevated scroll-mt-16">
      <div className="container-x">
        <SectionHeading
          eyebrow="Pourquoi EscapeClass"
          title="Un vrai problème professionnel, pas un quiz déguisé"
          description="L'apprenant doit chercher, analyser, décider. Il apprend en faisant et reçoit un feedback immédiat."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {items.map(({ icon: Icon, title, text }) => (
            <Card key={title} className="flex gap-4">
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-accent-soft text-accent">
                <Icon size={22} />
              </span>
              <div>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm text-text-muted">{text}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Formateurs / Organismes */
export function Audiences() {
  return (
    <section className="py-20 sm:py-24 border-t border-border">
      <div className="container-x grid gap-6 lg:grid-cols-2">
        <Card id="formateurs" className="scroll-mt-20">
          <span className="eyebrow">Pour les formateurs</span>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">Créez une mission, réutilisez-la avec tous vos groupes</h2>
          <ul className="mt-5 space-y-3 text-sm text-text-muted">
            {[
              "Step Builder : ajoutez, dupliquez, réorganisez vos étapes par glisser-déposer.",
              "10 types d'énigmes : code, mot secret, QCM, association, ordre logique, fichier à analyser…",
              "Indices à coût affiché, feedback de réussite et d'erreur, explication pédagogique.",
              "Écran live pendant la session : qui est bloqué, qui a fini, qui a demandé un indice.",
              "Génération assistée par IA, toujours relue et publiée par vous.",
            ].map((t) => (
              <li key={t} className="flex gap-2.5">
                <IconCheck size={16} className="mt-0.5 flex-none text-success" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
          <ButtonLink href="/register" variant="secondary" className="mt-6">
            Commencer gratuitement <IconArrowRight size={16} />
          </ButtonLink>
        </Card>
        <Card id="organismes" className="scroll-mt-20">
          <span className="eyebrow">Pour les organismes de formation</span>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">Différenciez votre offre et prouvez l&apos;engagement</h2>
          <ul className="mt-5 space-y-3 text-sm text-text-muted">
            {[
              "Des activités standardisées et réutilisables par toute votre équipe pédagogique.",
              "Statistiques par session, par groupe et par compétence : taux de réussite, énigmes difficiles, abandons.",
              "Organisations, gestion des formateurs et catalogue partagé (plan Business).",
              "Données de progression exploitables pour vos bilans et vos financeurs.",
              "Architecture prête pour SSO, API et intégration LMS (plan Enterprise).",
            ].map((t) => (
              <li key={t} className="flex gap-2.5">
                <IconBuilding size={16} className="mt-0.5 flex-none text-accent" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
          <ButtonLink href="/#tarifs" variant="secondary" className="mt-6">
            Voir les plans <IconArrowRight size={16} />
          </ButtonLink>
        </Card>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Fonctionnalités */
export function Features() {
  const features = [
    { icon: IconLayers, title: "Step Builder", text: "Étapes, énigmes, réponses acceptées, codes de déblocage et conditions." },
    { icon: IconLightbulb, title: "Indices progressifs", text: "Plusieurs indices par énigme, coût en points ou en temps annoncé avant la demande." },
    { icon: IconClock, title: "Chronomètre serveur", text: "Aucune limite, durée globale ou durée par étape. Pause, reprise, prolongation." },
    { icon: IconLock, title: "Codes secrets", text: "Numérique, mot, phrase, combinaison. Validation automatique ou par le formateur." },
    { icon: IconQr, title: "Sessions par code et QR", text: "Un code à 6 caractères, un QR code, un lobby. Individuel ou en équipes." },
    { icon: IconTrophy, title: "Score et classement", text: "Scoring configurable, 5 méthodes de classement dont un mode pédagogique." },
    { icon: IconChart, title: "Rapports et statistiques", text: "Compétences validées, énigmes les plus difficiles, taux d'indices, comparaison de groupes." },
    { icon: IconSparkles, title: "Génération IA", text: "Scénario, énigmes, indices et feedback proposés à partir d'un sujet. Jamais publié sans vous." },
    { icon: IconFile, title: "Fichiers à analyser", text: "Excel, PDF, CSV, images : l'apprenant travaille sur de vrais documents." },
  ];
  return (
    <section id="fonctionnalites" className="py-20 sm:py-24 border-t border-border bg-bg-elevated scroll-mt-16">
      <div className="container-x">
        <SectionHeading eyebrow="Fonctionnalités" title="Tout ce qu'il faut pour une mission crédible" />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => (
            <div key={title} className="card p-5">
              <Icon size={22} className="text-accent" />
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm text-text-muted">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Exemple */
export function ExampleGame() {
  const steps = [
    { n: 1, title: "Le fichier mystérieux", skill: "SOMME et calculs", code: "4729" },
    { n: 2, title: "Les données cachées", skill: "Références absolues", code: "EXCEL" },
    { n: 3, title: "L'erreur de formule", skill: "Recherche de données", code: "REPORTING" },
    { n: 4, title: "Le code final", skill: "Tableau croisé dynamique", code: "8294" },
    { n: 5, title: "Mission finale", skill: "Analyse des résultats", code: "—" },
  ];
  return (
    <section id="exemple" className="py-20 sm:py-24 border-t border-border scroll-mt-16">
      <div className="container-x grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <div>
          <span className="eyebrow">Exemple d&apos;Escape Game</span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight">Mission Excel — Le reporting disparu</h2>
          <p className="mt-4 text-text-muted">
            « Il est 16h30. Le reporting mensuel doit être envoyé à la direction à 17h. Mais le fichier Excel contient plusieurs
            erreurs. Votre mission : identifier les anomalies, corriger les données et récupérer le code permettant de débloquer
            le fichier final. »
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Pill tone="accent">30 minutes</Pill>
            <Pill>5 étapes</Pill>
            <Pill>Intermédiaire</Pill>
            <Pill tone="highlight">5 compétences</Pill>
          </div>
          <ButtonLink href="/demo" className="mt-6">
            Découvrir la démo <IconArrowRight size={16} />
          </ButtonLink>
        </div>
        <div className="card-glow p-5 sm:p-6">
          <ol className="divide-y divide-border">
            {steps.map((s) => (
              <li key={s.n} className="flex items-center gap-4 py-3">
                <span className="rail-dot">{s.n}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{s.title}</div>
                  <div className="text-xs text-text-muted">Compétence : {s.skill}</div>
                </div>
                <span className="code-chip text-xs" aria-label={`Code obtenu : ${s.code}`}>
                  {s.code}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Statistiques */
export function Stats() {
  const stats = [
    { value: "10", label: "types d'énigmes" },
    { value: "5", label: "méthodes de classement" },
    { value: "45 min", label: "durée type d'une mission" },
    { value: "100 %", label: "des validations côté serveur" },
  ];
  return (
    <section className="py-14 border-t border-border bg-bg-elevated">
      <div className="container-x grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <div className="text-3xl sm:text-4xl font-semibold text-accent tabular-nums">{s.value}</div>
            <div className="mt-1 text-sm text-text-muted">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Tarifs */
export function Pricing() {
  const plans = [
    {
      name: "Free",
      price: "0 €",
      period: "pour toujours",
      text: "Pour tester avec un premier groupe.",
      features: ["3 Escape Games", "10 sessions par mois", "30 participants par session", "Fonctionnalités essentielles"],
      cta: "Commencer",
      href: "/register",
      featured: false,
    },
    {
      name: "Pro",
      price: "Bientôt",
      period: "par formateur",
      text: "Pour les formateurs qui animent régulièrement.",
      features: ["Escape Games illimités", "Statistiques avancées", "Génération IA", "Personnalisation"],
      cta: "Être prévenu",
      href: "/register",
      featured: true,
    },
    {
      name: "Business",
      price: "Bientôt",
      period: "par organisme",
      text: "Pour les organismes et équipes pédagogiques.",
      features: ["Organisations et équipes", "Gestion des formateurs", "Analytics consolidés", "Catalogue partagé"],
      cta: "Être prévenu",
      href: "/register",
      featured: false,
    },
    {
      name: "Enterprise",
      price: "Sur devis",
      period: "",
      text: "Pour les grands comptes et intégrations.",
      features: ["SSO", "API", "Branding personnalisé", "Support dédié"],
      cta: "Nous contacter",
      href: "/register",
      featured: false,
    },
  ];
  return (
    <section id="tarifs" className="py-20 sm:py-24 border-t border-border scroll-mt-16">
      <div className="container-x">
        <SectionHeading
          eyebrow="Tarifs"
          title="Commencez gratuitement, évoluez quand vous en avez besoin"
          description="Le plan Free est disponible dès aujourd'hui. Les plans payants arrivent après le MVP ; aucune carte bancaire n'est demandée."
        />
        <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((p) => (
            <div key={p.name} className={p.featured ? "card-glow p-6 flex flex-col" : "card p-6 flex flex-col"}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">{p.name}</h3>
                {p.featured ? <Pill tone="accent">Recommandé</Pill> : null}
              </div>
              <div className="mt-4">
                <span className="text-3xl font-semibold">{p.price}</span>
                {p.period ? <span className="ml-1.5 text-sm text-text-muted">{p.period}</span> : null}
              </div>
              <p className="mt-2 text-sm text-text-muted">{p.text}</p>
              <ul className="mt-5 space-y-2 text-sm flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <IconCheck size={16} className="mt-0.5 flex-none text-success" /> {f}
                  </li>
                ))}
              </ul>
              <ButtonLink href={p.href} variant={p.featured ? "primary" : "secondary"} className="mt-6">
                {p.cta}
              </ButtonLink>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- FAQ */
export function FAQ() {
  const items = [
    {
      q: "Est-ce adapté à des adultes en formation professionnelle ?",
      a: "Oui, c'est le cœur du produit. L'interface est sobre et professionnelle, les énigmes sont des problèmes métier et le classement peut privilégier les compétences plutôt que la vitesse.",
    },
    {
      q: "Mes apprenants doivent-ils créer un compte ?",
      a: "Non. Ils rejoignent une session avec un code à 6 caractères ou un QR code, en indiquant simplement leur prénom. Leur progression est restaurée automatiquement s'ils perdent la connexion.",
    },
    {
      q: "Comment sont validées les réponses ?",
      a: "Sur le serveur, jamais dans le navigateur. Les bonnes réponses ne sont pas transmises à l'apprenant, les étapes verrouillées ne sont pas servies et les tentatives sont limitées.",
    },
    {
      q: "Puis-je accepter plusieurs réponses ou tolérer les fautes de frappe ?",
      a: "Oui. Chaque énigme accepte plusieurs réponses, et la normalisation ignore par défaut les majuscules, les accents et les espaces superflus.",
    },
    {
      q: "L'IA publie-t-elle directement le contenu ?",
      a: "Jamais. L'IA propose un scénario, des étapes, des énigmes, des indices et des feedbacks. Vous modifiez, vérifiez, prévisualisez puis publiez.",
    },
    {
      q: "Que se passe-t-il quand le temps est écoulé ?",
      a: "La mission se termine automatiquement, le résultat est sauvegardé, le score calculé et les compétences acquises ou non acquises affichées.",
    },
  ];
  return (
    <section id="faq" className="py-20 sm:py-24 border-t border-border bg-bg-elevated scroll-mt-16">
      <div className="container-x max-w-3xl">
        <SectionHeading eyebrow="FAQ" title="Questions fréquentes" />
        <div className="mt-10 space-y-3">
          {items.map((it) => (
            <details key={it.q} className="card group p-0">
              <summary className="cursor-pointer list-none px-5 py-4 font-medium flex items-center justify-between gap-4">
                {it.q}
                <span aria-hidden="true" className="text-text-muted transition-transform group-open:rotate-45 text-xl leading-none">
                  +
                </span>
              </summary>
              <p className="px-5 pb-5 text-sm text-text-muted">{it.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- CTA final */
export function FinalCTA() {
  return (
    <section className="py-20 sm:py-28 border-t border-border relative overflow-hidden">
      <div className="glow-accent -bottom-64 left-1/2 -translate-x-1/2" aria-hidden="true" />
      <div className="container-x relative text-center max-w-2xl">
        <IconRefresh size={28} className="mx-auto text-accent" />
        <h2 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight text-balance">
          Votre prochain cours peut devenir une mission.
        </h2>
        <p className="mt-4 text-text-muted">
          Créez votre premier Escape Game gratuitement, testez-le avec un groupe, puis dupliquez-le pour les suivants.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
          <ButtonLink href="/register" size="lg">
            Créer mon Escape Game <IconArrowRight size={18} />
          </ButtonLink>
          <ButtonLink href="/demo" variant="secondary" size="lg">
            Voir la démo
          </ButtonLink>
        </div>
        <p className="mt-6 text-xs text-text-subtle">
          Vous avez un code de session ?{" "}
          <Link href="/join" className="text-accent underline-offset-4 hover:underline">
            Rejoindre une mission
          </Link>
        </p>
      </div>
    </section>
  );
}
