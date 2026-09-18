/**
 * ScoringService — deterministic, server-side scoring.
 *
 * Formula (see docs/SCORING.md):
 *
 *   elapsed  = submittedAt − questionStartedAt (measured by the server)
 *   late     = elapsed > timeLimitMs + lateToleranceMs        → rejected: 0 points, streak reset
 *
 *   correct:
 *     base        = question points
 *     speedRatio  = max(0, 1 − elapsed / timeLimitMs)
 *     speedBonus  = round(maxSpeedBonus × speedWeight × speedRatio)
 *     streakAfter = streakBefore + 1
 *     streakBonus = streakEnabled ? streakBonuses[min(streakAfter, len) − 1] : 0
 *     multiplier  = doublePoints ? 2 : 1
 *     total       = (base + speedBonus + streakBonus) × multiplier
 *
 *   incorrect:
 *     streakAfter = 0
 *     total       = −wrongAnswerPenalty (0 by default — never implicit)
 *
 * Everything is integer arithmetic on the output side so results are stable
 * across platforms.
 */

export type ScoringConfig = {
  maxSpeedBonus: number;
  /** 0 → accuracy only, 1 → full speed bonus. */
  speedWeight: number;
  streakEnabled: boolean;
  /** Bonus for a streak of 1, 2, 3… The last value applies to longer streaks. */
  streakBonuses: number[];
  wrongAnswerPenalty: number;
  lateToleranceMs: number;
};

export const DEFAULT_SCORING: ScoringConfig = {
  maxSpeedBonus: 500,
  speedWeight: 1,
  streakEnabled: true,
  streakBonuses: [0, 50, 100, 150, 250],
  wrongAnswerPenalty: 0,
  lateToleranceMs: 750,
};

export type ScoreInput = {
  correct: boolean;
  /** Milliseconds between question start and answer receipt (server clock). */
  elapsedMs: number;
  /** Time allowed for this player on this question (includes Extra Time joker). */
  timeLimitMs: number;
  /** Streak before this answer. */
  streakBefore: number;
  /** Points of the question (base). */
  points: number;
  /** Double Points joker armed. */
  doublePoints?: boolean;
  config?: Partial<ScoringConfig>;
};

export type ScoreResult = {
  /** false when the answer arrived after the deadline (+ tolerance). */
  accepted: boolean;
  correct: boolean;
  basePoints: number;
  speedBonus: number;
  streakBonus: number;
  multiplier: number;
  penalty: number;
  /** Points added to the player's score (can be negative only with a penalty). */
  total: number;
  streakAfter: number;
};

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

export function streakBonusFor(streak: number, config: Pick<ScoringConfig, "streakEnabled" | "streakBonuses">): number {
  if (!config.streakEnabled || streak <= 0 || config.streakBonuses.length === 0) return 0;
  const idx = Math.min(streak, config.streakBonuses.length) - 1;
  return Math.max(0, Math.round(config.streakBonuses[idx] ?? 0));
}

export function speedBonusFor(elapsedMs: number, timeLimitMs: number, config: Pick<ScoringConfig, "maxSpeedBonus" | "speedWeight">): number {
  if (timeLimitMs <= 0) return 0;
  const ratio = clamp01(1 - elapsedMs / timeLimitMs);
  return Math.max(0, Math.round(config.maxSpeedBonus * clamp01(config.speedWeight) * ratio));
}

export function scoreAnswer(input: ScoreInput): ScoreResult {
  const cfg: ScoringConfig = { ...DEFAULT_SCORING, ...(input.config ?? {}) };
  const elapsed = Math.max(0, input.elapsedMs);
  const late = elapsed > input.timeLimitMs + cfg.lateToleranceMs;

  if (late) {
    return { accepted: false, correct: false, basePoints: 0, speedBonus: 0, streakBonus: 0, multiplier: 1, penalty: 0, total: 0, streakAfter: 0 };
  }
  if (!input.correct) {
    const penalty = Math.max(0, Math.round(cfg.wrongAnswerPenalty));
    return { accepted: true, correct: false, basePoints: 0, speedBonus: 0, streakBonus: 0, multiplier: 1, penalty, total: penalty === 0 ? 0 : -penalty, streakAfter: 0 };
  }
  const basePoints = Math.max(0, Math.round(input.points));
  const speedBonus = speedBonusFor(elapsed, input.timeLimitMs, cfg);
  const streakAfter = input.streakBefore + 1;
  const streakBonus = streakBonusFor(streakAfter, cfg);
  const multiplier = input.doublePoints ? 2 : 1;
  const total = (basePoints + speedBonus + streakBonus) * multiplier;
  return { accepted: true, correct: true, basePoints, speedBonus, streakBonus, multiplier, penalty: 0, total, streakAfter };
}

/** Team score = sum of its members' scores. */
export function teamScore(memberScores: number[]): number {
  return memberScores.reduce((a, b) => a + b, 0);
}

/** XP earned in a game = points scored (never negative). */
export function xpForScore(score: number): number {
  return Math.max(0, Math.round(score));
}
