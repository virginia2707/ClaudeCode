// Listes canoniques des valeurs "enum" (stockées en String dans SQLite).

export const ROLES = ["ADMIN", "TRAINER", "LEARNER"] as const;
export type Role = (typeof ROLES)[number];

export const PLANS = ["FREE", "PRO", "BUSINESS", "ENTERPRISE"] as const;
export type Plan = (typeof PLANS)[number];

export const ORG_ROLES = ["OWNER", "MANAGER", "TRAINER"] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

export const GAME_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
export type GameStatus = (typeof GAME_STATUSES)[number];

export const GAME_MODES = ["INDIVIDUAL", "TEAM"] as const;
export type GameMode = (typeof GAME_MODES)[number];

export const LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"] as const;
export type Level = (typeof LEVELS)[number];
export const LEVEL_LABELS: Record<Level, string> = {
  BEGINNER: "Débutant",
  INTERMEDIATE: "Intermédiaire",
  ADVANCED: "Avancé",
  EXPERT: "Expert",
};

export const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];
export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  EASY: "Facile",
  MEDIUM: "Moyen",
  HARD: "Difficile",
};

export const CATEGORIES = [
  "BUREAUTIQUE",
  "MANAGEMENT",
  "VENTE",
  "SECURITE",
  "QUALITE",
  "RH",
  "COMPTABILITE",
  "INFORMATIQUE",
  "LANGUES",
  "AUTRE",
] as const;
export type Category = (typeof CATEGORIES)[number];
export const CATEGORY_LABELS: Record<Category, string> = {
  BUREAUTIQUE: "Bureautique",
  MANAGEMENT: "Management",
  VENTE: "Vente & relation client",
  SECURITE: "Sécurité & prévention",
  QUALITE: "Qualité",
  RH: "Ressources humaines",
  COMPTABILITE: "Comptabilité & gestion",
  INFORMATIQUE: "Informatique",
  LANGUES: "Langues",
  AUTRE: "Autre",
};

export const TIMER_MODES = ["NONE", "GLOBAL", "PER_STEP"] as const;
export type TimerMode = (typeof TIMER_MODES)[number];

export const LEADERBOARD_METHODS = ["PEDAGOGICAL", "SCORE", "TIME", "COMPLETION", "HINTS"] as const;
export type LeaderboardMethod = (typeof LEADERBOARD_METHODS)[number];
export const LEADERBOARD_LABELS: Record<LeaderboardMethod, string> = {
  PEDAGOGICAL: "Pédagogique (compétences > rapidité)",
  SCORE: "Score",
  TIME: "Temps",
  COMPLETION: "Réussite",
  HINTS: "Nombre d'indices",
};

export const SESSION_STATUSES = ["LOBBY", "RUNNING", "PAUSED", "ENDED"] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const PROGRESS_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "ABANDONED", "TIMED_OUT"] as const;
export type ProgressStatus = (typeof PROGRESS_STATUSES)[number];

export const STEP_STATES = ["LOCKED", "AVAILABLE", "CURRENT", "DONE"] as const;
export type StepState = (typeof STEP_STATES)[number];

export const VALIDATION_MODES = ["AUTO", "MANUAL"] as const;
export type ValidationMode = (typeof VALIDATION_MODES)[number];

export const SCORE_EVENT_TYPES = [
  "STEP_SUCCESS",
  "TIME_BONUS",
  "NO_HINT_BONUS",
  "STREAK_BONUS",
  "HINT_PENALTY",
  "WRONG_ANSWER_PENALTY",
  "TIMEOUT_PENALTY",
  "TRAINER_ADJUSTMENT",
] as const;
export type ScoreEventType = (typeof SCORE_EVENT_TYPES)[number];

export const ANALYTICS_EVENTS = [
  "game_created",
  "game_published",
  "session_started",
  "player_joined",
  "step_started",
  "answer_submitted",
  "answer_correct",
  "answer_wrong",
  "hint_requested",
  "step_completed",
  "game_completed",
  "game_abandoned",
] as const;
export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

export const BADGE_RULES = [
  "FIRST_ESCAPE",
  "MASTER_SOLVER",
  "NO_HINT",
  "SPEED_RUNNER",
  "PERFECT_SCORE",
  "TEAM_PLAYER",
  "CUSTOM",
] as const;
export type BadgeRule = (typeof BADGE_RULES)[number];

export const APP_NAME = "EscapeClass";
export const SESSION_COOKIE = "escapeclass_session";
export const PLAYER_COOKIE = "escapeclass_player";
