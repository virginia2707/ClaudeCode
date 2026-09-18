// Canonical enum-like string values. SQLite has no native enum support in
// Prisma, so these are the single source of truth used across the app —
// keep them in sync with the comments in prisma/schema.prisma.

export const ROLES = ["ADMIN", "FORMATEUR", "APPRENANT"] as const;
export type RoleValue = (typeof ROLES)[number];

export const PLANS = ["FREE", "PRO", "BUSINESS", "ENTERPRISE"] as const;
export type PlanValue = (typeof PLANS)[number];

export const SIMULATION_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
export type SimulationStatusValue = (typeof SIMULATION_STATUSES)[number];

export const DIFFICULTIES = ["EASY", "MEDIUM", "HARD", "EXPERT"] as const;
export type DifficultyValue = (typeof DIFFICULTIES)[number];

export const PROGRESS_STATUSES = ["IN_PROGRESS", "COMPLETED", "ABANDONED"] as const;
export type ProgressStatusValue = (typeof PROGRESS_STATUSES)[number];

export const AI_INTERACTION_TYPES = [
  "GENERATE_SIMULATION",
  "COACH_HINT",
  "GENERATE_FEEDBACK",
  "GENERATE_REPORT",
] as const;
export type AIInteractionTypeValue = (typeof AI_INTERACTION_TYPES)[number];

export const PLAN_LIMITS: Record<PlanValue, { simulations: number | null; learners: number | null }> = {
  FREE: { simulations: 1, learners: 10 },
  PRO: { simulations: null, learners: 100 },
  BUSINESS: { simulations: null, learners: null },
  ENTERPRISE: { simulations: null, learners: null },
};

// XP levels — game levels, never presented as a professional qualification.
export const XP_LEVELS = [
  { level: 1, name: "Newcomer", min: 0, max: 499 },
  { level: 2, name: "Apprentice", min: 500, max: 999 },
  { level: 3, name: "Professional", min: 1000, max: 1999 },
  { level: 4, name: "Expert", min: 2000, max: 3499 },
  { level: 5, name: "Master", min: 3500, max: Infinity },
] as const;

export function levelForXP(xp: number) {
  return XP_LEVELS.find((l) => xp >= l.min && xp <= l.max) ?? XP_LEVELS[XP_LEVELS.length - 1];
}

// Pedagogical proficiency labels for the skill radar — explicitly not a
// certification, see section 10 of the product spec.
export function proficiencyLabel(score: number) {
  if (score >= 80) return "avancé";
  if (score >= 50) return "intermédiaire";
  if (score >= 25) return "débutant";
  return "novice";
}

export const DEFAULT_VARIABLES = [
  "customer_satisfaction",
  "team_morale",
  "company_reputation",
  "operational_performance",
  "financial_impact",
  "leadership",
  "communication",
  "problem_solving",
  "decision_making",
  "stress_management",
] as const;

export const VARIABLE_LABELS: Record<string, string> = {
  customer_satisfaction: "Satisfaction client",
  team_morale: "Moral de l'équipe",
  company_reputation: "Réputation",
  operational_performance: "Performance opérationnelle",
  financial_impact: "Impact financier",
  leadership: "Leadership",
  communication: "Communication",
  problem_solving: "Résolution de problème",
  decision_making: "Prise de décision",
  stress_management: "Gestion du stress",
};

export const BADGE_CRITERIA_TYPES = [
  "first_decision",
  "first_mission",
  "mission_complete",
  "perfect_mission",
  "simulation_complete",
  "skill_threshold",
  "fast_decision",
] as const;
