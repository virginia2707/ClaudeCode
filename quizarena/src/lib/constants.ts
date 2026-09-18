// Canonical enum-like values (SQLite has no Prisma enums).

export const ROLES = ["TRAINER", "ADMIN", "LEARNER"] as const;
export type Role = (typeof ROLES)[number];

export const PLANS = ["FREE", "PRO", "BUSINESS", "ENTERPRISE"] as const;
export type Plan = (typeof PLANS)[number];

export const QUIZ_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
export type QuizStatus = (typeof QUIZ_STATUSES)[number];

export const DIFFICULTIES = ["EASY", "MEDIUM", "HARD", "EXPERT"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];
export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  EASY: "Débutant",
  MEDIUM: "Intermédiaire",
  HARD: "Avancé",
  EXPERT: "Expert",
};

export const GAME_MODES = ["INDIVIDUAL", "TEAM"] as const;
export type GameMode = (typeof GAME_MODES)[number];

export const GAME_STATUSES = [
  "LOBBY",
  "QUESTION",
  "REVEAL",
  "LEADERBOARD",
  "PAUSED",
  "FINISHED",
  "ABANDONED",
] as const;
export type GameStatus = (typeof GAME_STATUSES)[number];

export const JOKER_TYPES = ["FIFTY_FIFTY", "DOUBLE_POINTS", "EXTRA_TIME", "SECOND_CHANCE"] as const;
export type JokerType = (typeof JOKER_TYPES)[number];
export const JOKER_LABELS: Record<JokerType, { name: string; short: string; description: string }> = {
  FIFTY_FIFTY: { name: "50/50", short: "50/50", description: "Supprime deux mauvaises réponses." },
  DOUBLE_POINTS: { name: "Double Points", short: "×2", description: "La prochaine bonne réponse rapporte deux fois plus." },
  EXTRA_TIME: { name: "Extra Time", short: "+10 s", description: "Ajoute 10 secondes sur cette question." },
  SECOND_CHANCE: { name: "Second Chance", short: "2ᵉ essai", description: "Autorise une deuxième tentative si la première est fausse." },
};

/** Plan limits used by the (future) billing layer. Enforced server-side. */
export const PLAN_LIMITS: Record<Plan, { maxQuizzes: number; maxPlayersPerGame: number; ai: boolean; teams: boolean }> = {
  FREE: { maxQuizzes: 3, maxPlayersPerGame: 25, ai: false, teams: false },
  PRO: { maxQuizzes: Infinity, maxPlayersPerGame: 200, ai: true, teams: true },
  BUSINESS: { maxQuizzes: Infinity, maxPlayersPerGame: 500, ai: true, teams: true },
  ENTERPRISE: { maxQuizzes: Infinity, maxPlayersPerGame: Infinity, ai: true, teams: true },
};

export const ANALYTICS_EVENTS = [
  "quiz_created",
  "game_created",
  "player_joined",
  "game_started",
  "question_answered",
  "joker_used",
  "quiz_completed",
  "badge_unlocked",
  "game_abandoned",
] as const;
export type AnalyticsEventType = (typeof ANALYTICS_EVENTS)[number];

export const SESSION_COOKIE = "qa_session";
export const PLAYER_COOKIE = "qa_player";
export const APP_NAME = "QuizArena";
export const TAGLINE = "Turn learning into a competition.";
