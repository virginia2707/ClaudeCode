import type { Plan } from "@/lib/constants";

// Limites par plan. Aucun paiement dans le MVP : le plan est un champ utilisateur.
export type PlanLimits = {
  label: string;
  maxGames: number | null; // null = illimité
  maxSessionsPerMonth: number | null;
  maxParticipantsPerSession: number;
  ai: boolean;
  advancedStats: boolean;
  organizations: boolean;
  sso: boolean;
  api: boolean;
  branding: boolean;
};

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  FREE: {
    label: "Free",
    maxGames: 3,
    maxSessionsPerMonth: 10,
    maxParticipantsPerSession: 30,
    ai: false,
    advancedStats: false,
    organizations: false,
    sso: false,
    api: false,
    branding: false,
  },
  PRO: {
    label: "Pro",
    maxGames: null,
    maxSessionsPerMonth: null,
    maxParticipantsPerSession: 100,
    ai: true,
    advancedStats: true,
    organizations: false,
    sso: false,
    api: false,
    branding: true,
  },
  BUSINESS: {
    label: "Business",
    maxGames: null,
    maxSessionsPerMonth: null,
    maxParticipantsPerSession: 300,
    ai: true,
    advancedStats: true,
    organizations: true,
    sso: false,
    api: false,
    branding: true,
  },
  ENTERPRISE: {
    label: "Enterprise",
    maxGames: null,
    maxSessionsPerMonth: null,
    maxParticipantsPerSession: 1000,
    ai: true,
    advancedStats: true,
    organizations: true,
    sso: true,
    api: true,
    branding: true,
  },
};
