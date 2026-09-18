import type { BadgeRule } from "@/lib/constants";
import { parseJson } from "@/lib/json";

export type BadgeContext = {
  completed: boolean;
  stepsCompleted: number;
  stepsTotal: number;
  hintsUsed: number;
  wrongAnswers: number;
  score: number;
  maxScore: number;
  timeSpentSeconds: number;
  targetSeconds: number | null;
  isTeam: boolean;
  isFirstGame: boolean;
};

export type BadgeDefinition = { id: string; code: string; name: string; ruleType: string; ruleConfig: string };

/** Évaluation d'une règle de badge. Ajouter un badge = ajouter un cas ici. */
export function evaluateBadgeRule(ruleType: string, ruleConfig: string, ctx: BadgeContext): boolean {
  const config = parseJson<Record<string, number>>(ruleConfig, {});
  switch (ruleType as BadgeRule) {
    case "FIRST_ESCAPE":
      return ctx.completed && ctx.isFirstGame;
    case "MASTER_SOLVER":
      return ctx.stepsTotal > 0 && ctx.stepsCompleted === ctx.stepsTotal;
    case "NO_HINT":
      return ctx.completed && ctx.hintsUsed === 0;
    case "SPEED_RUNNER":
      if (!ctx.completed || !ctx.targetSeconds) return false;
      return ctx.timeSpentSeconds <= ctx.targetSeconds * (config.ratio ?? 0.5);
    case "PERFECT_SCORE":
      return ctx.completed && ctx.maxScore > 0 && ctx.score >= ctx.maxScore;
    case "TEAM_PLAYER":
      return ctx.completed && ctx.isTeam;
    case "CUSTOM":
      // Règle générique paramétrable : seuils optionnels.
      if (config.minSteps !== undefined && ctx.stepsCompleted < config.minSteps) return false;
      if (config.minScore !== undefined && ctx.score < config.minScore) return false;
      if (config.maxHints !== undefined && ctx.hintsUsed > config.maxHints) return false;
      return true;
    default:
      return false;
  }
}

export function awardableBadges(badges: BadgeDefinition[], ctx: BadgeContext) {
  return badges.filter((b) => evaluateBadgeRule(b.ruleType, b.ruleConfig, ctx));
}

/** Badges système installés pour chaque nouveau jeu. */
export const SYSTEM_BADGES: { code: string; name: string; description: string; icon: string; ruleType: BadgeRule; ruleConfig: string }[] = [
  { code: "FIRST_ESCAPE", name: "First Escape", description: "Première mission terminée.", icon: "flag", ruleType: "FIRST_ESCAPE", ruleConfig: "{}" },
  { code: "MASTER_SOLVER", name: "Master Solver", description: "Toutes les énigmes réussies.", icon: "key", ruleType: "MASTER_SOLVER", ruleConfig: "{}" },
  { code: "NO_HINT", name: "No Hint", description: "Mission réussie sans aucun indice.", icon: "lightbulb", ruleType: "NO_HINT", ruleConfig: "{}" },
  { code: "SPEED_RUNNER", name: "Speed Runner", description: "Mission terminée en moins de la moitié du temps.", icon: "clock", ruleType: "SPEED_RUNNER", ruleConfig: '{"ratio":0.5}' },
  { code: "PERFECT_SCORE", name: "Perfect Score", description: "Score au moins égal au barème complet des énigmes.", icon: "star", ruleType: "PERFECT_SCORE", ruleConfig: "{}" },
  { code: "TEAM_PLAYER", name: "Team Player", description: "Mission réussie en équipe.", icon: "users", ruleType: "TEAM_PLAYER", ruleConfig: "{}" },
];
