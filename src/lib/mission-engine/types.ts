// ─────────────────────────────────────────────────────────────────────────────
// Moteur de missions — types et registre des mécaniques.
//
// Une mission est une machine à états pilotée côté serveur :
//   briefing → étape courante → (tâches | décision | livrable) → feedback →
//   résolution de la prochaine étape (linéaire ou branchée) → … → bilan.
//
// Chaque mécanique ("action type") est décrite par une définition déclarative.
// Ajouter une mécanique = ajouter une entrée au registre + un composant de
// rendu + un grader, sans toucher au moteur (principe ouvert/fermé).
// ─────────────────────────────────────────────────────────────────────────────

export const ACTION_TYPES = [
  "BRIEFING",
  "ANALYSIS",
  "DECISION",
  "RANKING",
  "MATCHING",
  "CALCULATION",
  "MCQ",
  "SHORT_ANSWER",
  "LONG_TEXT",
  "DOCUMENT",
  "UPLOAD",
  "PRESENTATION",
  "DEBRIEF",
] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export type GradingMode = "AUTO" | "RUBRIC" | "TRAINER" | "AI_ASSISTED" | "NONE";

export type ActionTypeDefinition = {
  type: ActionType;
  label: string;
  description: string;
  /** Mode d'évaluation par défaut ; le formateur peut le surcharger. */
  grading: GradingMode;
  /** L'apprenant produit-il un artefact (livrable) ? */
  producesDeliverable: boolean;
  /** Disponible dans le MVP ou réservé à une phase ultérieure. */
  availability: "MVP" | "LATER";
};

export const ACTION_TYPE_REGISTRY: Record<ActionType, ActionTypeDefinition> = {
  BRIEFING: {
    type: "BRIEFING",
    label: "Briefing",
    description: "Présentation immersive de la situation : qui, où, quel problème, pourquoi, délai, contraintes, résultat attendu.",
    grading: "NONE",
    producesDeliverable: false,
    availability: "MVP",
  },
  ANALYSIS: {
    type: "ANALYSIS",
    label: "Analyse",
    description: "Analyser un tableau, un jeu de données, un document, un graphique ou un rapport et répondre à des questions ciblées.",
    grading: "AUTO",
    producesDeliverable: false,
    availability: "MVP",
  },
  DECISION: {
    type: "DECISION",
    label: "Décision",
    description: "Choisir une stratégie parmi plusieurs options ; chaque option a des conséquences et est comparée aux contraintes.",
    grading: "AUTO",
    producesDeliverable: false,
    availability: "MVP",
  },
  RANKING: {
    type: "RANKING",
    label: "Classement",
    description: "Prioriser des éléments (actions, risques, segments).",
    grading: "AUTO",
    producesDeliverable: false,
    availability: "MVP",
  },
  MATCHING: {
    type: "MATCHING",
    label: "Association",
    description: "Associer des paires : problème → solution, client → offre, risque → mesure.",
    grading: "AUTO",
    producesDeliverable: false,
    availability: "MVP",
  },
  CALCULATION: {
    type: "CALCULATION",
    label: "Calcul",
    description: "Produire une valeur numérique (budget, marge, taux) avec tolérance configurable.",
    grading: "AUTO",
    producesDeliverable: false,
    availability: "MVP",
  },
  MCQ: {
    type: "MCQ",
    label: "Question à choix",
    description: "Question fermée à réponse unique ou multiple, corrigée automatiquement.",
    grading: "AUTO",
    producesDeliverable: false,
    availability: "MVP",
  },
  SHORT_ANSWER: {
    type: "SHORT_ANSWER",
    label: "Réponse courte",
    description: "Réponse rédigée en quelques phrases, évaluée par mots-clés ou par le formateur.",
    grading: "AI_ASSISTED",
    producesDeliverable: false,
    availability: "MVP",
  },
  LONG_TEXT: {
    type: "LONG_TEXT",
    label: "Texte long",
    description: "Analyse ou recommandation argumentée, évaluée par grille de critères.",
    grading: "RUBRIC",
    producesDeliverable: true,
    availability: "MVP",
  },
  DOCUMENT: {
    type: "DOCUMENT",
    label: "Création de document",
    description: "Rapport, plan marketing, email, plan d'action, proposition commerciale rédigés dans l'éditeur.",
    grading: "RUBRIC",
    producesDeliverable: true,
    availability: "MVP",
  },
  UPLOAD: {
    type: "UPLOAD",
    label: "Dépôt de fichier",
    description: "Dépôt d'un fichier PDF, DOCX, XLSX, PPTX, CSV ou TXT évalué par le formateur.",
    grading: "TRAINER",
    producesDeliverable: true,
    availability: "MVP",
  },
  PRESENTATION: {
    type: "PRESENTATION",
    label: "Présentation",
    description: "Défendre sa solution. MVP : réponse textuelle ou document ; plus tard : vidéo, audio, évaluation IA.",
    grading: "RUBRIC",
    producesDeliverable: true,
    availability: "MVP",
  },
  DEBRIEF: {
    type: "DEBRIEF",
    label: "Bilan",
    description: "Synthèse de fin de mission : score, décisions, compétences, points forts, axes de progression.",
    grading: "NONE",
    producesDeliverable: false,
    availability: "MVP",
  },
};

// ── État d'exécution d'une mission (persisté dans LearnerProgress.stateJson) ──

export type MissionVariables = Record<string, number | string | boolean>;

export type MissionRuntimeState = {
  /** Variables de mission (budgetRemaining, teamMorale…) modifiées par les conséquences. */
  variables: MissionVariables;
  /** Compléments de contexte injectés par les décisions, dans l'ordre. */
  contextUpdates: { stepKey: string; text: string }[];
  /** Ressources révélées par des conséquences. */
  revealedResourceIds: string[];
  /** Clés d'étapes visitées, pour le fil d'Ariane et le bilan. */
  visitedStepKeys: string[];
};

export const EMPTY_RUNTIME_STATE: MissionRuntimeState = {
  variables: {},
  contextUpdates: [],
  revealedResourceIds: [],
  visitedStepKeys: [],
};

// ── Vérification des contraintes ─────────────────────────────────────────────

export type ConstraintSpec = {
  key: string;
  label: string;
  operator: "MAX" | "MIN" | "EQ";
  value: number;
  unit?: string | null;
};

export type ConstraintCheck = {
  constraintKey: string;
  label: string;
  value: number;
  limit: number;
  unit?: string | null;
  satisfied: boolean;
  /** Écart signé par rapport à la limite (positif = dépassement). */
  delta: number;
};

/**
 * Compare les coûts d'une option ({ budget: 38000 }) aux contraintes de la
 * mission et produit des alertes lisibles ("dépasse le budget de 8 000 €").
 */
export function checkConstraints(
  costs: Record<string, number>,
  constraints: ConstraintSpec[],
): ConstraintCheck[] {
  const checks: ConstraintCheck[] = [];
  for (const c of constraints) {
    const value = costs[c.key];
    if (typeof value !== "number") continue;
    let satisfied = true;
    let delta = 0;
    if (c.operator === "MAX") {
      satisfied = value <= c.value;
      delta = value - c.value;
    } else if (c.operator === "MIN") {
      satisfied = value >= c.value;
      delta = c.value - value;
    } else {
      satisfied = value === c.value;
      delta = value - c.value;
    }
    checks.push({ constraintKey: c.key, label: c.label, value, limit: c.value, unit: c.unit, satisfied, delta });
  }
  return checks;
}

export function formatConstraintAlert(check: ConstraintCheck, formatNumber = (n: number) => n.toLocaleString("fr-FR")) {
  const unit = check.unit ? ` ${check.unit}` : "";
  if (check.satisfied) return `${check.label} respecté (${formatNumber(check.value)}${unit}).`;
  return `Votre proposition dépasse la limite « ${check.label} » de ${formatNumber(Math.abs(check.delta))}${unit}.`;
}
