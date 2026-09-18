import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon, type IconName } from "@/components/ui/icons";
import { ProgressBar, SkillList } from "@/components/ui/progress";
import { SectionHeading } from "@/components/ui/section-heading";
import { LAUNCH_48H_PREVIEW as M } from "@/lib/demo/launch-48h-preview";

const PIPELINE = ["Mission", "Problème", "Analyse", "Décision", "Action", "Livrable", "Feedback", "Compétences"];

const HOW_IT_WORKS: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "book",
    title: "1. Importez votre cours",
    text: "PDF, DOCX, PPTX, texte ou lien. MissionIA identifie les concepts, les objectifs et les compétences à mobiliser.",
  },
  {
    icon: "sparkles",
    title: "2. Générez une proposition de mission",
    text: "Contexte, rôle, problème, contraintes, étapes, décisions, conséquences, livrables et grille d'évaluation. Rien n'est publié sans vous.",
  },
  {
    icon: "layers",
    title: "3. Ajustez dans le Mission Builder",
    text: "Réorganisez les étapes, affinez les données, réglez les conséquences et les critères. Vous gardez le contrôle éditorial.",
  },
  {
    icon: "users",
    title: "4. Lancez une session et suivez",
    text: "Invitez vos apprenants, suivez leurs décisions et leurs livrables, évaluez avec l'aide de l'IA, analysez les compétences.",
  },
];

const WHY: { title: string; text: string }[] = [
  { title: "Le problème avant la théorie", text: "L'apprenant rencontre une situation réelle et va chercher les connaissances dont il a besoin pour la résoudre." },
  { title: "Des décisions qui ont des conséquences", text: "Chaque choix modifie le contexte, débloque une information ou déclenche une alerte. On apprend de ce qui se passe ensuite." },
  { title: "Des productions concrètes", text: "Email à la direction, budget, plan d'action à 30 jours, présentation : les livrables d'un vrai poste, pas des QCM." },
  { title: "Un feedback qui explique", text: "Pas de « correct / incorrect ». Réussite, erreur, explication, conséquence et recommandation à chaque étape." },
  { title: "Des compétences visibles", text: "Chaque étape mobilise des compétences identifiées. L'apprenant et le formateur voient ce qui est acquis et ce qui reste à renforcer." },
  { title: "Une gamification sobre", text: "XP, badges et niveaux restent discrets et professionnels. Le formateur peut passer en mode « compétences uniquement »." },
];

const TRAINER_FEATURES = [
  "Créer une mission à partir de zéro ou d'un cours existant",
  "Définir scénario, rôle, contraintes, données et ressources",
  "Construire des étapes : analyse, décision, classement, calcul, document, dépôt",
  "Écrire des décisions avec conséquences et parcours branchés",
  "Demander des livrables avec grille de critères",
  "Lancer des sessions, inviter, suivre en temps réel",
  "Évaluer manuellement ou valider une proposition de l'IA",
  "Dupliquer, versionner et réutiliser vos missions",
];

const ORG_FEATURES = [
  "Organisation multi-formateurs avec rôles Admin, Formateur, Apprenant",
  "Bibliothèque de missions et de compétences partagée",
  "Parcours multi-missions : découverte, application, simulation, mission finale",
  "Statistiques par mission, par session et par compétence",
  "Isolation stricte des données par organisation",
  "Architecture prête pour SSO, API, branding et intégrations LMS",
];

const AI_CAPABILITIES: { title: string; text: string; icon: IconName }[] = [
  { icon: "book", title: "Analyse de cours", text: "Extrait concepts, objectifs, procédures et compétences d'un contenu existant." },
  { icon: "compass", title: "Génération de mission", text: "Propose scénario, rôle, problème, contraintes, étapes, décisions, données, livrables et critères." },
  { icon: "message", title: "Coach en 5 niveaux", text: "Question de réflexion, indice, explication, exemple, aide directe. Jamais la solution d'emblée. Activable par le formateur." },
  { icon: "shield", title: "Évaluation assistée", text: "Propose une notation sur votre grille, avec justification et niveau de confiance. Vous consultez, modifiez, validez ou rejetez." },
];

const SKILL_STATS = [
  { name: "Prise de décision", value: 78 },
  { name: "Communication écrite", value: 71 },
  { name: "Gestion budgétaire", value: 64 },
  { name: "Analyse de données", value: 52 },
];

const PLANS = [
  {
    name: "Free",
    price: "0 €",
    period: "pour démarrer",
    features: ["3 missions", "1 formateur", "Sessions illimitées", "Bilan de compétences apprenant"],
    cta: "Commencer gratuitement",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "29 €",
    period: "par formateur et par mois",
    features: ["Missions illimitées", "Génération de missions par IA", "Coach IA et évaluation assistée", "Statistiques par mission"],
    cta: "Choisir Pro",
    highlighted: true,
  },
  {
    name: "Business",
    price: "99 €",
    period: "par organisation et par mois",
    features: ["Plusieurs formateurs", "Bibliothèque partagée", "Parcours multi-missions", "Statistiques avancées par compétence"],
    cta: "Choisir Business",
    highlighted: false,
  },
  {
    name: "Enterprise",
    price: "Sur devis",
    period: "grands comptes",
    features: ["SSO et API", "Branding personnalisé", "Intégrations LMS, SCORM, Teams", "Accompagnement pédagogique"],
    cta: "Nous contacter",
    highlighted: false,
  },
];

const FAQ = [
  {
    q: "Est-ce que l'IA publie des missions toute seule ?",
    a: "Non. L'IA produit une proposition que vous relisez, modifiez et prévisualisez. Rien n'est visible des apprenants avant votre validation explicite.",
  },
  {
    q: "L'IA donne-t-elle les réponses aux apprenants ?",
    a: "Le coach travaille par niveaux d'aide progressifs, de la question de réflexion à l'aide directe. Vous choisissez les niveaux autorisés, ou vous désactivez le coach.",
  },
  {
    q: "Comment sont évalués les livrables ?",
    a: "Selon la grille de critères que vous définissez (clarté, pertinence, exactitude, faisabilité, justification…). Les exercices fermés sont corrigés automatiquement ; l'IA peut proposer une évaluation que vous validez ou corrigez.",
  },
  {
    q: "Un apprenant peut-il voir les corrigés en inspectant la page ?",
    a: "Non. Corrigés, critères cachés et conséquences restent côté serveur. Le navigateur ne reçoit que ce que l'apprenant est autorisé à voir à cet instant.",
  },
  {
    q: "Puis-je désactiver le score et les badges ?",
    a: "Oui. Chaque mission peut fonctionner en mode « compétences uniquement », sans classement ni points.",
  },
  {
    q: "Que deviennent mes contenus et les données des apprenants ?",
    a: "Vos contenus restent votre propriété, isolés par organisation. Les données personnelles sont filtrées ou pseudonymisées avant tout appel à un fournisseur d'IA.",
  },
];

export default function LandingPage() {
  return (
    <main id="contenu" className="flex-1">
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="glow" aria-hidden="true" />
        <div className="grid-bg absolute inset-0" aria-hidden="true" />
        <div className="container-x relative grid gap-12 py-20 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:py-28">
          <div>
            <p className="eyebrow mb-4">Parcours pédagogiques sous forme de missions</p>
            <h1 className="display">Transformez vos cours en missions professionnelles.</h1>
            <p className="lead mt-6 max-w-xl">
              Avec MissionIA, vos apprenants apprennent en résolvant des problèmes réels, en prenant des décisions et en
              produisant des livrables.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/register" size="lg" trailingIcon={<Icon name="arrow-right" className="h-4 w-4" />}>
                Créer ma première mission
              </ButtonLink>
              <ButtonLink href="/demo" size="lg" variant="secondary" leadingIcon={<Icon name="play" className="h-4 w-4" />}>
                Voir une mission démo
              </ButtonLink>
            </div>
            <ol className="mt-10 flex flex-wrap items-center gap-x-2 gap-y-2 text-xs font-medium text-text-muted" aria-label="Structure d'une mission">
              {PIPELINE.map((step, i) => (
                <li key={step} className="flex items-center gap-2">
                  <span className={i === 0 || i === PIPELINE.length - 1 ? "text-accent" : undefined}>{step}</span>
                  {i < PIPELINE.length - 1 && (
                    <span aria-hidden="true" className="text-border-strong">
                      →
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </div>

          {/* Aperçu écran apprenant */}
          <Card variant="elevated" className="relative p-5 sm:p-6" aria-label="Aperçu de l'écran apprenant">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge tone="accent">Mission 2 / 5</Badge>
                <Badge>Étape 3 / 5</Badge>
              </div>
              <span className="mono-num flex items-center gap-1.5 text-xs text-text-muted">
                <Icon name="clock" className="h-3.5 w-3.5" /> 41 min restantes
              </span>
            </div>
            <p className="mt-4 text-xs uppercase tracking-wider text-text-muted">Votre rôle</p>
            <p className="font-semibold">{M.role} · {M.company}</p>
            <p className="mt-3 text-sm text-text-secondary">{M.briefing.slice(0, 190)}…</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {M.constraints.map((c) => (
                <div key={c.key} className="card-inset px-3 py-2">
                  <p className="text-[0.65rem] uppercase tracking-wider text-text-muted">{c.label}</p>
                  <p className="mono-num text-sm font-semibold text-signal">{c.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-5">
              <p className="mb-2 text-xs uppercase tracking-wider text-text-muted">Progression</p>
              <ProgressBar value={60} label="Progression de la mission" />
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs uppercase tracking-wider text-text-muted">Compétences</p>
                <SkillList skills={M.skills.slice(0, 4)} />
              </div>
              <div>
                <p className="mb-2 text-xs uppercase tracking-wider text-text-muted">Action attendue</p>
                <p className="text-sm text-text-secondary">Choisir la stratégie de lancement et justifier votre choix devant la direction.</p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* ── COMMENT ÇA MARCHE ──────────────────────────────────────────── */}
      <section id="comment-ca-marche" className="container-x scroll-mt-20 py-20">
        <SectionHeading
          eyebrow="Comment ça marche"
          title="De « voici mon cours de 20 pages » à « voici une mission de 60 minutes »."
          description="Quatre étapes, et le formateur garde la main à chacune d'elles."
        />
        <ol className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {HOW_IT_WORKS.map((s) => (
            <li key={s.title}>
              <Card className="h-full p-6">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <Icon name={s.icon} />
                </span>
                <h3 className="h3 mt-4">{s.title}</h3>
                <p className="mt-2 text-sm text-text-secondary">{s.text}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      {/* ── POURQUOI LES MISSIONS ──────────────────────────────────────── */}
      <section id="pourquoi" className="scroll-mt-20 border-y border-border bg-bg-elevated py-20">
        <div className="container-x">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-start">
            <div>
              <SectionHeading
                eyebrow="Pourquoi les missions"
                title="Inverser la logique : le problème d'abord, la théorie ensuite."
                description="Le modèle classique enchaîne chapitres, quiz et examen. Une mission place l'apprenant dans une situation professionnelle et lui demande d'agir."
              />
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <Card variant="inset" className="p-4">
                  <p className="text-xs uppercase tracking-wider text-text-muted">Modèle classique</p>
                  <p className="mt-2 text-sm text-text-secondary">Cours → Chapitre 1 → Chapitre 2 → Quiz → Chapitre 3 → Examen</p>
                </Card>
                <Card variant="inset" className="border-accent/40 p-4">
                  <p className="text-xs uppercase tracking-wider text-accent">MissionIA</p>
                  <p className="mt-2 text-sm text-text">Problème → Recherche → Apprentissage → Application → Feedback</p>
                </Card>
              </div>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2">
              {WHY.map((w) => (
                <li key={w.title} className="card p-5">
                  <h3 className="font-semibold">{w.title}</h3>
                  <p className="mt-1.5 text-sm text-text-secondary">{w.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── POUR LES FORMATEURS ────────────────────────────────────────── */}
      <section id="formateurs" className="container-x scroll-mt-20 py-20">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <SectionHeading
              eyebrow="Pour les formateurs"
              title="Un Mission Builder complet, sans écrire une ligne de code."
              description="Vous concevez l'expérience comme un scénariste : contexte, rôle, données, décisions, conséquences, livrables, critères."
            />
            <ul className="mt-8 grid gap-2.5 sm:grid-cols-2">
              {TRAINER_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-text-secondary">
                  <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <Card className="p-5 sm:p-6" aria-label="Aperçu du Mission Builder">
            <div className="flex items-center justify-between">
              <p className="font-semibold">{M.title}</p>
              <Badge tone="signal">Brouillon</Badge>
            </div>
            <ol className="mt-4 space-y-2">
              {M.steps.map((s, i) => (
                <li key={s.key} className="card-inset flex items-center gap-3 px-3 py-2.5">
                  <span aria-hidden="true" className="cursor-grab text-text-muted">
                    ⋮⋮
                  </span>
                  <span className="mono-num text-xs text-text-muted">{String(i + 1).padStart(2, "0")}</span>
                  <span className="flex-1 text-sm">{s.title}</span>
                  <Badge>{s.type}</Badge>
                </li>
              ))}
            </ol>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge tone="accent">4 contraintes</Badge>
              <Badge tone="accent">2 jeux de données</Badge>
              <Badge tone="accent">1 décision branchée</Badge>
              <Badge tone="accent">Grille : 5 critères</Badge>
            </div>
          </Card>
        </div>
      </section>

      {/* ── POUR LES ORGANISMES ────────────────────────────────────────── */}
      <section id="organismes" className="scroll-mt-20 border-y border-border bg-bg-elevated py-20">
        <div className="container-x grid gap-10 lg:grid-cols-2 lg:items-center">
          <Card className="order-2 p-5 sm:p-6 lg:order-1" aria-label="Structure d'une organisation">
            <p className="eyebrow mb-4">Architecture</p>
            <ul className="space-y-2 text-sm">
              {[
                ["Organisation", "NovaSkills Formation", 0],
                ["Admin", "gère utilisateurs, formateurs et contenus", 1],
                ["Formateurs", "créent missions et sessions", 1],
                ["Apprenants", "rejoignent des sessions", 1],
                ["Missions", "bibliothèque partagée, versionnée", 2],
                ["Sessions", "individuelles ou en équipe", 2],
                ["Résultats", "décisions, livrables, compétences", 2],
              ].map(([k, v, depth]) => (
                <li key={k as string} className="flex items-center gap-2" style={{ paddingLeft: `${(depth as number) * 1.25}rem` }}>
                  <span aria-hidden="true" className="text-border-strong">
                    {(depth as number) > 0 ? "└" : "●"}
                  </span>
                  <span className="font-medium">{k}</span>
                  <span className="text-text-muted">· {v}</span>
                </li>
              ))}
            </ul>
          </Card>
          <div className="order-1 lg:order-2">
            <SectionHeading
              eyebrow="Pour les organismes de formation"
              title="Une plateforme pensée pour plusieurs formateurs, plusieurs promotions, un référentiel commun."
              description="Écoles, organismes, directions formation : structurez vos missions par organisation et suivez les compétences à l'échelle."
            />
            <ul className="mt-8 space-y-2.5">
              {ORG_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-text-secondary">
                  <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── L'IA ──────────────────────────────────────────────────────── */}
      <section id="ia" className="container-x scroll-mt-20 py-20">
        <SectionHeading
          eyebrow="L'IA"
          align="center"
          title="Une IA qui accélère le formateur, jamais une IA qui le remplace."
          description="Chaque proposition de l'IA passe par votre relecture, votre modification, votre prévisualisation et votre validation avant publication."
        />
        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {AI_CAPABILITIES.map((c) => (
            <Card key={c.title} className="p-6">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <Icon name={c.icon} />
              </span>
              <h3 className="h3 mt-4">{c.title}</h3>
              <p className="mt-2 text-sm text-text-secondary">{c.text}</p>
            </Card>
          ))}
        </div>
        <Card variant="inset" className="mt-8 p-5">
          <p className="text-sm text-text-secondary">
            <span className="font-semibold text-text">Workflow de génération :</span> contenu du cours → analyse IA → objectifs → compétences →
            proposition de mission → <span className="text-accent">review du formateur</span> → modification → prévisualisation → validation →
            publication.
          </p>
        </Card>
      </section>

      {/* ── COMPÉTENCES ────────────────────────────────────────────────── */}
      <section id="competences" className="scroll-mt-20 border-y border-border bg-bg-elevated py-20">
        <div className="container-x grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <SectionHeading
              eyebrow="Compétences"
              title="Chaque étape mobilise des compétences identifiées."
              description="Analyse, prise de décision, communication, gestion budgétaire… L'apprenant voit ce qu'il mobilise ; le formateur voit ce qui est maîtrisé et ce qu'il faut renforcer."
            />
            <ul className="mt-8 space-y-2.5 text-sm text-text-secondary">
              <li className="flex items-start gap-2.5"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-success" />Référentiel de compétences par organisation ou bibliothèque globale</li>
              <li className="flex items-start gap-2.5"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-success" />Compétences rattachées aux missions, aux étapes et aux tâches</li>
              <li className="flex items-start gap-2.5"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-success" />Bilan de compétences individuel en fin de mission</li>
              <li className="flex items-start gap-2.5"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-success" />Mode « compétences uniquement », sans score ni classement</li>
            </ul>
          </div>
          <Card className="p-5 sm:p-6" aria-label="Exemple de bilan de compétences">
            <div className="flex items-center justify-between">
              <p className="font-semibold">Bilan de compétences</p>
              <Badge tone="success">Mission terminée</Badge>
            </div>
            <SkillList
              className="mt-4"
              skills={[
                { name: "Analyse de données", state: "acquired" },
                { name: "Communication écrite", state: "acquired" },
                { name: "Prise de décision", state: "in_progress" },
                { name: "Gestion budgétaire", state: "pending" },
              ]}
            />
            <div className="divider my-5" />
            <p className="text-xs uppercase tracking-wider text-text-muted">Points forts</p>
            <p className="mt-1 text-sm text-text-secondary">Ciblage cohérent avec les données. Recommandation structurée et argumentée.</p>
            <p className="mt-3 text-xs uppercase tracking-wider text-text-muted">À renforcer</p>
            <p className="mt-1 text-sm text-text-secondary">Anticiper la charge de l&apos;équipe dans le plan à 30 jours.</p>
          </Card>
        </div>
      </section>

      {/* ── STATISTIQUES ───────────────────────────────────────────────── */}
      <section id="statistiques" className="container-x scroll-mt-20 py-20">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <Card className="p-5 sm:p-6" aria-label="Exemple de statistiques formateur">
            <div className="flex items-center justify-between">
              <p className="font-semibold">Session · Promotion Marketing 2026</p>
              <Badge>24 apprenants</Badge>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                ["Complétion", "88 %"],
                ["Score moyen", "72 / 100"],
                ["Temps moyen", "54 min"],
              ].map(([k, v]) => (
                <div key={k} className="card-inset px-3 py-2.5">
                  <p className="text-[0.65rem] uppercase tracking-wider text-text-muted">{k}</p>
                  <p className="mono-num text-base font-semibold">{v}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-xs uppercase tracking-wider text-text-muted">Niveau attendu atteint, par compétence</p>
            <ul className="mt-2 space-y-3">
              {SKILL_STATS.map((s) => (
                <li key={s.name}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span>{s.name}</span>
                  </div>
                  <ProgressBar value={s.value} label={`${s.name} : ${s.value} % des apprenants au niveau attendu`} />
                </li>
              ))}
            </ul>
            <div className="alert alert-warning mt-5">
              <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0 text-signal" />
              <p className="text-sm text-text-secondary">
                <span className="font-semibold text-text">Recommandation :</span> prévoir une activité de renforcement sur l&apos;interprétation des
                données.
              </p>
            </div>
          </Card>
          <SectionHeading
            eyebrow="Statistiques"
            title="Des statistiques qui parlent compétences, pas seulement scores."
            description="Taux de complétion, temps moyen, étapes problématiques, décisions les plus fréquentes, compétences maîtrisées et à renforcer : de quoi ajuster la formation, pas seulement la noter."
          />
        </div>
      </section>

      {/* ── EXEMPLE ────────────────────────────────────────────────────── */}
      <section id="exemple" className="scroll-mt-20 border-y border-border bg-bg-elevated py-20">
        <div className="container-x">
          <SectionHeading eyebrow="Exemple" title={`« ${M.title} »`} description="Une mission complète de démonstration, du briefing au plan de lancement à 30 jours." />
          <div className="mt-10 grid gap-5 lg:grid-cols-[1.2fr_1fr]">
            <Card className="p-6">
              <div className="flex flex-wrap gap-2">
                <Badge tone="accent">{M.sector}</Badge>
                <Badge>{M.level}</Badge>
                <Badge>{M.durationMinutes} min</Badge>
                <Badge>Individuel</Badge>
              </div>
              <blockquote className="mt-5 border-l-2 border-accent pl-4 text-text-secondary">{M.briefing}</blockquote>
              <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {M.constraints.map((c) => (
                  <div key={c.key} className="card-inset px-3 py-2">
                    <dt className="text-[0.65rem] uppercase tracking-wider text-text-muted">{c.label}</dt>
                    <dd className="mono-num text-sm font-semibold text-signal">{c.value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
            <Card className="p-6">
              <p className="font-semibold">Les 5 étapes</p>
              <ol className="mt-4 space-y-3">
                {M.steps.map((s, i) => (
                  <li key={s.key} className="flex items-center gap-3 text-sm">
                    <span className="mono-num inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">{i + 1}</span>
                    <span className="flex-1">{s.title}</span>
                    <Badge>{s.type}</Badge>
                  </li>
                ))}
              </ol>
              <p className="mt-5 text-sm text-text-muted">
                Livrable final : <span className="text-text">plan de lancement de 30 jours</span>, évalué sur clarté, pertinence, exactitude, faisabilité et
                justification.
              </p>
              <ButtonLink href="/demo" variant="secondary" className="mt-5 w-full" trailingIcon={<Icon name="arrow-right" className="h-4 w-4" />}>
                Ouvrir l&apos;aperçu de la mission
              </ButtonLink>
            </Card>
          </div>
        </div>
      </section>

      {/* ── TARIFS ─────────────────────────────────────────────────────── */}
      <section id="tarifs" className="container-x scroll-mt-20 py-20">
        <SectionHeading eyebrow="Tarifs" align="center" title="Un plan pour chaque étape de votre activité." description="Tarifs indicatifs de lancement. Le paiement en ligne arrive après le MVP ; les plans sont déjà modélisés dans la plateforme." />
        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {PLANS.map((p) => (
            <Card key={p.name} variant={p.highlighted ? "elevated" : "default"} className={p.highlighted ? "relative p-6 ring-1 ring-accent/50" : "p-6"}>
              {p.highlighted && (
                <Badge tone="accent" className="absolute -top-3 left-6">
                  Recommandé
                </Badge>
              )}
              <h3 className="h3">{p.name}</h3>
              <p className="mono-num mt-3 text-3xl font-semibold">{p.price}</p>
              <p className="text-xs text-text-muted">{p.period}</p>
              <ul className="mt-5 space-y-2 text-sm text-text-secondary">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    {f}
                  </li>
                ))}
              </ul>
              <ButtonLink href="/register" variant={p.highlighted ? "primary" : "secondary"} className="mt-6 w-full">
                {p.cta}
              </ButtonLink>
            </Card>
          ))}
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────── */}
      <section id="faq" className="scroll-mt-20 border-y border-border bg-bg-elevated py-20">
        <div className="container-x grid gap-10 lg:grid-cols-[1fr_1.5fr]">
          <SectionHeading eyebrow="FAQ" title="Questions fréquentes" description="Sur la place de l'IA, l'évaluation, la sécurité des contenus et les données des apprenants." />
          <div className="space-y-3">
            {FAQ.map((item) => (
              <details key={item.q} className="card group p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span aria-hidden="true" className="text-text-muted transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-text-secondary">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ──────────────────────────────────────────────────── */}
      <section id="cta" className="container-x py-24">
        <Card variant="elevated" className="relative overflow-hidden p-8 text-center sm:p-14">
          <div className="glow" aria-hidden="true" />
          <div className="relative">
            <p className="eyebrow mb-4">Prêt à briefer vos apprenants ?</p>
            <h2 className="h1">Votre prochain cours peut devenir une mission.</h2>
            <p className="lead mx-auto mt-4 max-w-xl">Créez un compte, importez un contenu, relisez la proposition et lancez votre première session.</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <ButtonLink href="/register" size="lg" trailingIcon={<Icon name="arrow-right" className="h-4 w-4" />}>
                Créer ma première mission
              </ButtonLink>
              <ButtonLink href="/demo" size="lg" variant="secondary">
                Voir une mission démo
              </ButtonLink>
            </div>
            <p className="mt-6 text-xs text-text-muted">
              Vous préférez d&apos;abord comprendre l&apos;approche ?{" "}
              <Link href="#pourquoi" className="text-accent underline-offset-4 hover:underline">
                Lire « Pourquoi les missions »
              </Link>
              .
            </p>
          </div>
        </Card>
      </section>
    </main>
  );
}
