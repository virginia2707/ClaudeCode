import { describe, expect, it } from "vitest";
import { DEFAULT_SCORING, scoreAnswer, speedBonusFor, streakBonusFor, teamScore, xpForScore } from "./scoring";

const T = 20_000; // 20 s question

describe("ScoringService — documented examples", () => {
  it("3 s, streak 1 → 500 + 425 + 0 = 925", () => {
    const r = scoreAnswer({ correct: true, elapsedMs: 3_000, timeLimitMs: T, streakBefore: 0, points: 500 });
    expect(r).toMatchObject({ accepted: true, basePoints: 500, speedBonus: 425, streakBonus: 0, multiplier: 1, total: 925, streakAfter: 1 });
  });
  it("10 s, streak 2 → 500 + 250 + 50 = 800", () => {
    const r = scoreAnswer({ correct: true, elapsedMs: 10_000, timeLimitMs: T, streakBefore: 1, points: 500 });
    expect(r.total).toBe(800);
    expect(r.streakAfter).toBe(2);
  });
  it("19 s, streak 3 → 500 + 25 + 100 = 625", () => {
    const r = scoreAnswer({ correct: true, elapsedMs: 19_000, timeLimitMs: T, streakBefore: 2, points: 500 });
    expect(r.total).toBe(625);
  });
  it("3 s, streak 5, Double Points → (500 + 425 + 250) × 2 = 2350", () => {
    const r = scoreAnswer({ correct: true, elapsedMs: 3_000, timeLimitMs: T, streakBefore: 4, points: 500, doublePoints: true });
    expect(r).toMatchObject({ multiplier: 2, total: 2350, streakAfter: 5 });
  });
});

describe("ScoringService — deadline", () => {
  it("accepts an answer within the tolerance window with no speed bonus", () => {
    const r = scoreAnswer({ correct: true, elapsedMs: 20_500, timeLimitMs: T, streakBefore: 0, points: 500 });
    expect(r.accepted).toBe(true);
    expect(r.speedBonus).toBe(0);
    expect(r.total).toBe(500);
  });
  it("accepts exactly at the tolerance boundary", () => {
    const r = scoreAnswer({ correct: true, elapsedMs: T + DEFAULT_SCORING.lateToleranceMs, timeLimitMs: T, streakBefore: 3, points: 500 });
    expect(r.accepted).toBe(true);
  });
  it("rejects one millisecond past the tolerance: 0 points, streak reset", () => {
    const r = scoreAnswer({ correct: true, elapsedMs: T + DEFAULT_SCORING.lateToleranceMs + 1, timeLimitMs: T, streakBefore: 3, points: 500 });
    expect(r).toMatchObject({ accepted: false, total: 0, streakAfter: 0, basePoints: 0, speedBonus: 0, streakBonus: 0 });
  });
  it("Extra Time extends the deadline through timeLimitMs", () => {
    const r = scoreAnswer({ correct: true, elapsedMs: 25_000, timeLimitMs: T + 10_000, streakBefore: 0, points: 500 });
    expect(r.accepted).toBe(true);
    expect(r.speedBonus).toBe(Math.round(500 * (1 - 25 / 30)));
  });
});

describe("ScoringService — wrong answers", () => {
  it("gives 0 and resets the streak by default (no implicit penalty)", () => {
    const r = scoreAnswer({ correct: false, elapsedMs: 1_000, timeLimitMs: T, streakBefore: 4, points: 500 });
    expect(r).toMatchObject({ accepted: true, correct: false, total: 0, penalty: 0, streakAfter: 0 });
  });
  it("applies an explicit penalty only when configured", () => {
    const r = scoreAnswer({ correct: false, elapsedMs: 1_000, timeLimitMs: T, streakBefore: 0, points: 500, config: { wrongAnswerPenalty: 100 } });
    expect(r.total).toBe(-100);
    expect(r.penalty).toBe(100);
  });
  it("Double Points does not amplify a penalty", () => {
    const r = scoreAnswer({ correct: false, elapsedMs: 1_000, timeLimitMs: T, streakBefore: 0, points: 500, doublePoints: true, config: { wrongAnswerPenalty: 100 } });
    expect(r.total).toBe(-100);
    expect(r.multiplier).toBe(1);
  });
});

describe("ScoringService — speed weight (accuracy-first mode)", () => {
  it("speedWeight 0 removes the speed bonus entirely", () => {
    const r = scoreAnswer({ correct: true, elapsedMs: 0, timeLimitMs: T, streakBefore: 0, points: 500, config: { speedWeight: 0 } });
    expect(r.speedBonus).toBe(0);
    expect(r.total).toBe(500);
  });
  it("speedWeight 0.3 scales the bonus (3 s → 128)", () => {
    expect(speedBonusFor(3_000, T, { maxSpeedBonus: 500, speedWeight: 0.3 })).toBe(128);
  });
  it("clamps weights outside 0..1", () => {
    expect(speedBonusFor(0, T, { maxSpeedBonus: 500, speedWeight: 5 })).toBe(500);
    expect(speedBonusFor(0, T, { maxSpeedBonus: 500, speedWeight: -1 })).toBe(0);
  });
  it("instant answer earns the full bonus; answer at the limit earns none", () => {
    expect(speedBonusFor(0, T, DEFAULT_SCORING)).toBe(500);
    expect(speedBonusFor(T, T, DEFAULT_SCORING)).toBe(0);
    expect(speedBonusFor(T + 400, T, DEFAULT_SCORING)).toBe(0);
  });
  it("is robust to a zero time limit and negative elapsed", () => {
    expect(speedBonusFor(1_000, 0, DEFAULT_SCORING)).toBe(0);
    const r = scoreAnswer({ correct: true, elapsedMs: -50, timeLimitMs: T, streakBefore: 0, points: 500 });
    expect(r.speedBonus).toBe(500);
  });
});

describe("ScoringService — streaks", () => {
  it("follows the bonus table and caps at the last value", () => {
    const cfg = { streakEnabled: true, streakBonuses: [0, 50, 100, 150, 250] };
    expect([1, 2, 3, 4, 5, 6, 12].map((s) => streakBonusFor(s, cfg))).toEqual([0, 50, 100, 150, 250, 250, 250]);
  });
  it("gives nothing when streaks are disabled or the table is empty", () => {
    expect(streakBonusFor(5, { streakEnabled: false, streakBonuses: [0, 50] })).toBe(0);
    expect(streakBonusFor(5, { streakEnabled: true, streakBonuses: [] })).toBe(0);
    expect(streakBonusFor(0, { streakEnabled: true, streakBonuses: [0, 50] })).toBe(0);
  });
  it("uses a custom table from the quiz settings", () => {
    const r = scoreAnswer({ correct: true, elapsedMs: T, timeLimitMs: T, streakBefore: 1, points: 500, config: { streakBonuses: [0, 25, 50, 100, 200] } });
    expect(r.streakBonus).toBe(25);
  });
});

describe("ScoringService — rounding and helpers", () => {
  it("rounds fractional configuration values to integers", () => {
    const r = scoreAnswer({ correct: true, elapsedMs: 7_777, timeLimitMs: T, streakBefore: 0, points: 333.6 });
    expect(Number.isInteger(r.total)).toBe(true);
    expect(r.basePoints).toBe(334);
  });
  it("team score is the sum of members; XP never negative", () => {
    expect(teamScore([925, 800, 0])).toBe(1725);
    expect(teamScore([])).toBe(0);
    expect(xpForScore(-100)).toBe(0);
    expect(xpForScore(1234)).toBe(1234);
  });
  it("is deterministic", () => {
    const input = { correct: true, elapsedMs: 4_321, timeLimitMs: T, streakBefore: 2, points: 500 } as const;
    expect(scoreAnswer(input)).toEqual(scoreAnswer(input));
  });
});
