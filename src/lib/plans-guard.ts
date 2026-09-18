import "server-only";
import { prisma } from "@/lib/prisma";
import { PLAN_LIMITS } from "@/lib/plans";
import type { Plan } from "@/lib/constants";

export async function canCreateGame(user: { id: string; plan: string; role: string }) {
  if (user.role === "ADMIN") return { ok: true as const };
  const limits = PLAN_LIMITS[user.plan as Plan] ?? PLAN_LIMITS.FREE;
  if (limits.maxGames === null) return { ok: true as const };
  const count = await prisma.escapeGame.count({ where: { ownerId: user.id, status: { not: "ARCHIVED" } } });
  if (count >= limits.maxGames) {
    return {
      ok: false as const,
      error: `Votre plan ${limits.label} permet ${limits.maxGames} Escape Games actifs. Archivez-en un ou passez à un plan supérieur.`,
    };
  }
  return { ok: true as const };
}
