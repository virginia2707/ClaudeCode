// Aperçu statique de la mission de démonstration « 48 heures pour lancer le
// produit ». Les données complètes (jeux de données, tâches, grille) seront
// créées en phase 19 via le seed ; ce fichier alimente uniquement /demo et la
// section « Exemple » de la landing en phase 1.

export const LAUNCH_48H_PREVIEW = {
  title: "48 heures pour lancer le produit",
  sector: "Marketing B2B",
  role: "Responsable marketing",
  company: "NovaTech",
  durationMinutes: 60,
  level: "Intermédiaire",
  briefing:
    "Vous êtes responsable marketing de NovaTech. La direction vient de valider le lancement de NovaFlow, un logiciel B2B de pilotage des opérations. Vous disposez de 48 heures pour présenter votre stratégie de lancement. Votre budget est de 30 000 €. Les données clients sont incomplètes et l'équipe est réduite. Vous devez convaincre la direction que votre plan est viable.",
  objective: "Construire une stratégie de lancement réaliste et défendable devant la direction.",
  constraints: [
    { key: "budget", label: "Budget maximum", value: "30 000 €" },
    { key: "time", label: "Délai", value: "48 heures" },
    { key: "team", label: "Équipe", value: "3 personnes" },
    { key: "target", label: "Objectif", value: "+15 % de ventes" },
  ],
  skills: [
    { name: "Analyse de données", state: "acquired" as const },
    { name: "Segmentation", state: "acquired" as const },
    { name: "Prise de décision", state: "in_progress" as const },
    { name: "Gestion budgétaire", state: "pending" as const },
    { name: "Communication écrite", state: "pending" as const },
  ],
  steps: [
    { key: "s1", title: "Analyser les données du marché", type: "Analyse", state: "done" as const },
    { key: "s2", title: "Identifier la cible prioritaire", type: "Classement", state: "done" as const },
    { key: "s3", title: "Choisir une stratégie de lancement", type: "Décision", state: "current" as const },
    { key: "s4", title: "Construire le budget", type: "Calcul", state: "locked" as const },
    { key: "s5", title: "Produire la recommandation finale", type: "Livrable", state: "locked" as const },
  ],
  currentStep: {
    title: "Choisir une stratégie de lancement",
    objective: "Sélectionner le mix d'acquisition le plus cohérent avec la cible prioritaire et les contraintes.",
    context:
      "Votre analyse a montré que les PME industrielles de 50 à 250 salariés représentent 62 % des opportunités qualifiées. Le cycle de vente moyen est de 35 jours. Le directeur commercial insiste pour « être visible partout ».",
    instruction:
      "Choisissez la stratégie que vous défendrez devant la direction. Chaque option a un coût et des conséquences sur la suite de la mission.",
    resources: [
      { title: "Étude de marché Q2 (PDF)", type: "PDF", required: true, viewed: true },
      { title: "Données CRM — pipeline (XLSX)", type: "XLSX", required: true, viewed: true },
      { title: "Benchmark concurrents", type: "Texte", required: false, viewed: false },
    ],
  },
  decision: {
    prompt: "Où concentrez-vous l'essentiel du budget de lancement ?",
    budgetLimit: 30000,
    options: [
      {
        label: "A",
        text: "Investir principalement dans LinkedIn Ads ciblés sur les décideurs industriels.",
        budget: 26000,
        consequence:
          "Votre ciblage est cohérent avec la cible prioritaire. Les premiers leads arrivent au bout de 6 jours, mais votre directeur commercial regrette l'absence de visibilité plus large.",
        feedback:
          "Choix aligné sur l'analyse : vous mobilisez le canal où se trouvent les décideurs identifiés à l'étape 2. Pensez à justifier ce focus dans votre recommandation.",
        tone: "success" as const,
      },
      {
        label: "B",
        text: "Investir principalement dans Google Ads sur les requêtes génériques « logiciel opérations ».",
        budget: 34000,
        consequence:
          "Le volume de clics est élevé mais peu qualifié : 71 % des leads sont des TPE hors cible. Vous avez dépensé plus que prévu.",
        feedback:
          "La visibilité ne suffit pas : la stratégie ignore la segmentation réalisée à l'étape 2. Vous devrez réallouer des ressources à l'étape suivante.",
        tone: "warning" as const,
      },
      {
        label: "C",
        text: "Lancer une campagne d'influence avec trois experts du secteur industriel.",
        budget: 38000,
        consequence:
          "La crédibilité de NovaFlow progresse nettement, mais le budget est dépassé de 8 000 € et les retombées commerciales arriveront après la fenêtre de 48 heures.",
        feedback:
          "Pertinent sur le fond, incompatible avec les contraintes de budget et de délai. La direction attend un plan finançable dès demain.",
        tone: "danger" as const,
      },
      {
        label: "D",
        text: "Répartir le budget : 60 % LinkedIn Ads, 25 % emailing base CRM, 15 % webinaire de lancement.",
        budget: 29500,
        consequence:
          "Le plan respecte le budget et combine acquisition et activation de la base existante. Le webinaire vous donnera un temps fort à présenter à la direction.",
        feedback:
          "Stratégie équilibrée et finançable. Attention à la charge pour une équipe de 3 personnes : vous devrez prioriser dans le plan à 30 jours.",
        tone: "success" as const,
      },
    ],
  },
} as const;

export type LaunchPreview = typeof LAUNCH_48H_PREVIEW;
