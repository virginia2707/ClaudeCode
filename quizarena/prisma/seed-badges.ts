import type { PrismaClient } from "@prisma/client";
import type { BadgeCriteria } from "@/lib/game/badge-criteria";

/**
 * Default badge catalog. Criteria are stored as JSON on each Badge row, so a
 * trainer/admin can tune thresholds (or add new badges with the same
 * criteria shapes — see src/lib/game/badge-criteria.ts) without a code change.
 */
export const DEFAULT_BADGES: { code: string; name: string; description: string; icon: string; criteria: BadgeCriteria }[] = [
  {
    code: "FIRST_VICTORY",
    name: "First Victory",
    description: "Première victoire (1ʳᵉ place) sur un compte QuizArena.",
    icon: "trophy",
    criteria: { type: "first_win" },
  },
  {
    code: "QUIZ_CHAMPION",
    name: "Quiz Champion",
    description: "1ʳᵉ place dans une partie d'au moins deux participants.",
    icon: "crown",
    criteria: { type: "rank", max: 1, minPlayers: 2 },
  },
  {
    code: "TOP_3",
    name: "Top 3",
    description: "Termine dans le trio de tête.",
    icon: "medal",
    criteria: { type: "rank", max: 3, minPlayers: 3 },
  },
  {
    code: "PERFECT_ROUND",
    name: "Perfect Round",
    description: "100 % de bonnes réponses sur toutes les questions de la partie.",
    icon: "star",
    criteria: { type: "accuracy", min: 1, requireAllAnswered: true },
  },
  {
    code: "CONSISTENT_PLAYER",
    name: "Consistent Player",
    description: "A répondu à toutes les questions de la partie.",
    icon: "check-circle",
    criteria: { type: "all_answered" },
  },
  {
    code: "STREAK_MASTER",
    name: "Streak Master",
    description: "Série d'au moins 5 bonnes réponses d'affilée.",
    icon: "flame",
    criteria: { type: "streak", min: 5 },
  },
  {
    code: "SPEED_DEMON",
    name: "Speed Demon",
    description: "Temps de réponse moyen le plus rapide de la partie.",
    icon: "zap",
    criteria: { type: "fastest_in_game", minPlayers: 2 },
  },
  {
    code: "FAST_THINKER",
    name: "Fast Thinker",
    description: "Temps de réponse moyen inférieur à 6 secondes.",
    icon: "timer",
    criteria: { type: "avg_response_ms", max: 6000 },
  },
  {
    code: "COMEBACK",
    name: "Comeback",
    description: "A gagné au moins 3 places au classement sur la dernière question.",
    icon: "trending-up",
    criteria: { type: "comeback", minRankGain: 3 },
  },
  {
    code: "TEAM_PLAYER",
    name: "Team Player",
    description: "Membre de l'équipe gagnante.",
    icon: "users",
    criteria: { type: "winning_team" },
  },
];

export async function seedBadges(prisma: PrismaClient): Promise<void> {
  for (const b of DEFAULT_BADGES) {
    await prisma.badge.upsert({
      where: { code: b.code },
      update: { name: b.name, description: b.description, icon: b.icon, criteria: JSON.stringify(b.criteria) },
      create: { code: b.code, name: b.name, description: b.description, icon: b.icon, criteria: JSON.stringify(b.criteria) },
    });
  }
  console.log(`Seeded ${DEFAULT_BADGES.length} badges.`);
}
