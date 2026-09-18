import { z } from "zod";

/**
 * Badge criteria are stored as JSON on `Badge.criteria` — genuinely
 * configurable: an admin can change a threshold (or add a new badge with the
 * same shape) without touching code. `evaluateBadges` in badges.ts is the
 * only place that interprets this shape.
 */
export const badgeCriteriaSchema = z.discriminatedUnion("type", [
  /** Player finished in the top `max` ranks (optionally require a minimum field size). */
  z.object({ type: z.literal("rank"), max: z.number().int().min(1), minPlayers: z.number().int().min(1).default(1) }),
  /** Player's first-ever rank-1 finish (signed-in users only — needs cross-game history). */
  z.object({ type: z.literal("first_win") }),
  /** Player answered every question and reached at least `min` accuracy (1 = 100%). */
  z.object({ type: z.literal("accuracy"), min: z.number().min(0).max(1), requireAllAnswered: z.boolean().default(false) }),
  /** Player answered every question in the game, regardless of correctness. */
  z.object({ type: z.literal("all_answered") }),
  /** Player's best streak in the game reached at least `min`. */
  z.object({ type: z.literal("streak"), min: z.number().int().min(1) }),
  /** Player's average response time (ms) across answered questions was at most `max`. */
  z.object({ type: z.literal("avg_response_ms"), max: z.number().int().min(1) }),
  /** Player had the single fastest average response time among all participants. */
  z.object({ type: z.literal("fastest_in_game"), minPlayers: z.number().int().min(1).default(2) }),
  /** Player's rank improved by at least `minRankGain` positions on the final question. */
  z.object({ type: z.literal("comeback"), minRankGain: z.number().int().min(1) }),
  /** Player belonged to the winning team (team mode only). */
  z.object({ type: z.literal("winning_team") }),
]);
export type BadgeCriteria = z.infer<typeof badgeCriteriaSchema>;

export function parseBadgeCriteria(raw: string): BadgeCriteria | null {
  try {
    const result = badgeCriteriaSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
