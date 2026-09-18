// Valeurs canoniques des "enums" MissionIA.
// SQLite ne supporte pas les enums Prisma : ces listes sont la source de vérité,
// utilisées par les schémas Zod, les composants et les requêtes.

export const ORG_ROLES = ["ADMIN", "TRAINER", "LEARNER"] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

export const PLANS = ["FREE", "PRO", "BUSINESS", "ENTERPRISE"] as const;
export type Plan = (typeof PLANS)[number];

export const PLAN_LIMITS: Record<
  Plan,
  { missions: number | null; trainers: number | null; ai: boolean; analytics: "basic" | "advanced" }
> = {
  FREE: { missions: 3, trainers: 1, ai: false, analytics: "basic" },
  PRO: { missions: null, trainers: 1, ai: true, analytics: "basic" },
  BUSINESS: { missions: null, trainers: null, ai: true, analytics: "advanced" },
  ENTERPRISE: { missions: null, trainers: null, ai: true, analytics: "advanced" },
};

export const MISSION_STATUSES = ["DRAFT", "IN_REVIEW", "PUBLISHED", "ARCHIVED"] as const;
export type MissionStatus = (typeof MISSION_STATUSES)[number];

export const LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"] as const;
export type Level = (typeof LEVELS)[number];
export const LEVEL_LABELS: Record<Level, string> = {
  BEGINNER: "Débutant",
  INTERMEDIATE: "Intermédiaire",
  ADVANCED: "Avancé",
  EXPERT: "Expert",
};

export const MISSION_MODES = ["INDIVIDUAL", "TEAM"] as const;
export type MissionMode = (typeof MISSION_MODES)[number];

export const SCORING_MODES = ["SCORE_AND_SKILLS", "SKILLS_ONLY"] as const;
export type ScoringMode = (typeof SCORING_MODES)[number];

export const CONSTRAINT_TYPES = ["BUDGET", "TIME", "TEAM", "TARGET", "RISK", "CUSTOM"] as const;
export type ConstraintType = (typeof CONSTRAINT_TYPES)[number];
export const CONSTRAINT_OPERATORS = ["MAX", "MIN", "EQ"] as const;

export const RESOURCE_TYPES = ["TEXT", "PDF", "IMAGE", "VIDEO", "LINK", "XLSX", "DOCX", "PPTX", "CSV"] as const;
export type ResourceType = (typeof RESOURCE_TYPES)[number];

export const DELIVERABLE_FORMATS = [
  "EMAIL",
  "REPORT",
  "ACTION_PLAN",
  "PRESENTATION",
  "SPREADSHEET",
  "MEMO",
  "PROPOSAL",
  "TABLE",
  "OTHER",
] as const;
export type DeliverableFormat = (typeof DELIVERABLE_FORMATS)[number];

export const UPLOAD_MIME_TYPES: Record<string, string> = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPTX",
  "text/csv": "CSV",
  "text/plain": "TXT",
};
export const UPLOAD_MAX_BYTES = 20 * 1024 * 1024;

export const EVALUATOR_TYPES = ["AUTO", "AI", "TRAINER"] as const;
export const EVALUATION_STATUSES = ["PROPOSED", "VALIDATED", "MODIFIED", "REJECTED"] as const;

export const FEEDBACK_KINDS = ["SUCCESS", "ERROR", "EXPLANATION", "CONSEQUENCE", "RECOMMENDATION"] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

export const PROGRESS_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "ABANDONED"] as const;
export type ProgressStatus = (typeof PROGRESS_STATUSES)[number];

export const SESSION_STATUSES = ["SCHEDULED", "OPEN", "CLOSED", "ARCHIVED"] as const;

export const AI_JOB_TYPES = [
  "ANALYZE_COURSE",
  "GENERATE_MISSION",
  "GENERATE_SCENARIO",
  "GENERATE_STEPS",
  "GENERATE_DECISION",
  "GENERATE_FEEDBACK",
  "EVALUATE_DELIVERABLE",
  "COACH_RESPONSE",
  "LEARNING_REPORT",
] as const;
export type AIJobType = (typeof AI_JOB_TYPES)[number];

// Niveaux d'aide du coach IA : du plus socratique au plus direct.
export const COACH_HELP_LEVELS = [
  { level: 1, label: "Question de réflexion" },
  { level: 2, label: "Indice" },
  { level: 3, label: "Explication d'un concept" },
  { level: 4, label: "Exemple similaire" },
  { level: 5, label: "Aide plus directe" },
] as const;

export const BADGE_CRITERIA = [
  { code: "MISSION_STARTER", name: "Mission Starter", description: "Première mission terminée.", criteriaType: "FIRST_MISSION" },
  { code: "DECISION_MAKER", name: "Decision Maker", description: "10 décisions prises.", criteriaType: "DECISIONS_COUNT" },
  { code: "PROBLEM_SOLVER", name: "Problem Solver", description: "5 problèmes résolus.", criteriaType: "PROBLEMS_SOLVED" },
  { code: "STRATEGIST", name: "Strategist", description: "Mission stratégique terminée.", criteriaType: "STRATEGIC_MISSION" },
  { code: "PERFECT_MISSION", name: "Perfect Mission", description: "Tous les objectifs atteints.", criteriaType: "PERFECT_MISSION" },
] as const;

export const XP_LEVELS = [
  { level: 1, name: "Analyste junior", min: 0 },
  { level: 2, name: "Chargé de mission", min: 500 },
  { level: 3, name: "Responsable", min: 1200 },
  { level: 4, name: "Directeur de mission", min: 2500 },
  { level: 5, name: "Stratège", min: 4500 },
] as const;

export function levelForXP(xp: number) {
  let current: (typeof XP_LEVELS)[number] = XP_LEVELS[0];
  for (const l of XP_LEVELS) if (xp >= l.min) current = l;
  return current;
}
