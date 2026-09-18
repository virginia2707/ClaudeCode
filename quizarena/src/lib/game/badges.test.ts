import { describe, expect, it } from "vitest";
import { matchesCriteria, type GameBadgeContext, type PlayerBadgeContext } from "./badges";
import type { BadgeCriteria } from "./badge-criteria";

function player(overrides: Partial<PlayerBadgeContext> = {}): PlayerBadgeContext {
  return {
    gamePlayerId: "p1",
    userId: null,
    rank: 1,
    previousRank: null,
    correctCount: 0,
    answeredCount: 0,
    bestStreak: 0,
    avgResponseMs: 10_000,
    teamId: null,
    isFirstWinForUser: false,
    ...overrides,
  };
}
function game(overrides: Partial<GameBadgeContext> = {}): GameBadgeContext {
  return { totalQuestions: 5, totalPlayers: 4, mode: "INDIVIDUAL", winningTeamId: null, fastestPlayerId: null, ...overrides };
}

describe("matchesCriteria", () => {
  it("rank: honours max and minPlayers", () => {
    const c: BadgeCriteria = { type: "rank", max: 3, minPlayers: 3 };
    expect(matchesCriteria(c, player({ rank: 3 }), game({ totalPlayers: 3 }))).toBe(true);
    expect(matchesCriteria(c, player({ rank: 4 }), game({ totalPlayers: 5 }))).toBe(false);
    expect(matchesCriteria(c, player({ rank: 1 }), game({ totalPlayers: 2 }))).toBe(false); // field too small
  });

  it("first_win: only for signed-in rank-1 players marked as first win", () => {
    const c: BadgeCriteria = { type: "first_win" };
    expect(matchesCriteria(c, player({ rank: 1, userId: "u1", isFirstWinForUser: true }), game())).toBe(true);
    expect(matchesCriteria(c, player({ rank: 1, userId: "u1", isFirstWinForUser: false }), game())).toBe(false);
    expect(matchesCriteria(c, player({ rank: 1, userId: null }), game())).toBe(false);
    expect(matchesCriteria(c, player({ rank: 2, userId: "u1", isFirstWinForUser: true }), game())).toBe(false);
  });

  it("accuracy: requires answers, honours the all-answered flag", () => {
    const strict: BadgeCriteria = { type: "accuracy", min: 1, requireAllAnswered: true };
    expect(matchesCriteria(strict, player({ correctCount: 5, answeredCount: 5 }), game({ totalQuestions: 5 }))).toBe(true);
    expect(matchesCriteria(strict, player({ correctCount: 4, answeredCount: 4 }), game({ totalQuestions: 5 }))).toBe(false); // didn't answer all
    expect(matchesCriteria(strict, player({ correctCount: 0, answeredCount: 0 }), game({ totalQuestions: 5 }))).toBe(false);

    const loose: BadgeCriteria = { type: "accuracy", min: 0.5, requireAllAnswered: false };
    expect(matchesCriteria(loose, player({ correctCount: 2, answeredCount: 3 }), game())).toBe(true);
    expect(matchesCriteria(loose, player({ correctCount: 1, answeredCount: 3 }), game())).toBe(false);
  });

  it("all_answered: exact match against total questions", () => {
    const c: BadgeCriteria = { type: "all_answered" };
    expect(matchesCriteria(c, player({ answeredCount: 5 }), game({ totalQuestions: 5 }))).toBe(true);
    expect(matchesCriteria(c, player({ answeredCount: 4 }), game({ totalQuestions: 5 }))).toBe(false);
    expect(matchesCriteria(c, player({ answeredCount: 0 }), game({ totalQuestions: 0 }))).toBe(false);
  });

  it("streak: threshold is inclusive", () => {
    const c: BadgeCriteria = { type: "streak", min: 5 };
    expect(matchesCriteria(c, player({ bestStreak: 5 }), game())).toBe(true);
    expect(matchesCriteria(c, player({ bestStreak: 4 }), game())).toBe(false);
  });

  it("avg_response_ms: requires at least one answer", () => {
    const c: BadgeCriteria = { type: "avg_response_ms", max: 6000 };
    expect(matchesCriteria(c, player({ avgResponseMs: 5000, answeredCount: 3 }), game())).toBe(true);
    expect(matchesCriteria(c, player({ avgResponseMs: 6001, answeredCount: 3 }), game())).toBe(false);
    expect(matchesCriteria(c, player({ avgResponseMs: 0, answeredCount: 0 }), game())).toBe(false);
  });

  it("fastest_in_game: matches only the designated fastest player id, and needs a minimum field", () => {
    const c: BadgeCriteria = { type: "fastest_in_game", minPlayers: 2 };
    expect(matchesCriteria(c, player({ gamePlayerId: "p1" }), game({ fastestPlayerId: "p1", totalPlayers: 2 }))).toBe(true);
    expect(matchesCriteria(c, player({ gamePlayerId: "p2" }), game({ fastestPlayerId: "p1", totalPlayers: 2 }))).toBe(false);
    expect(matchesCriteria(c, player({ gamePlayerId: "p1" }), game({ fastestPlayerId: "p1", totalPlayers: 1 }))).toBe(false);
  });

  it("comeback: rank must have improved by at least minRankGain on the final question", () => {
    const c: BadgeCriteria = { type: "comeback", minRankGain: 3 };
    expect(matchesCriteria(c, player({ previousRank: 5, rank: 2 }), game())).toBe(true); // gained 3
    expect(matchesCriteria(c, player({ previousRank: 4, rank: 2 }), game())).toBe(false); // gained 2
    expect(matchesCriteria(c, player({ previousRank: null, rank: 1 }), game())).toBe(false);
  });

  it("winning_team: only in TEAM mode, only for members of the top-scoring team", () => {
    const c: BadgeCriteria = { type: "winning_team" };
    expect(matchesCriteria(c, player({ teamId: "t1" }), game({ mode: "TEAM", winningTeamId: "t1" }))).toBe(true);
    expect(matchesCriteria(c, player({ teamId: "t2" }), game({ mode: "TEAM", winningTeamId: "t1" }))).toBe(false);
    expect(matchesCriteria(c, player({ teamId: "t1" }), game({ mode: "INDIVIDUAL", winningTeamId: null }))).toBe(false);
  });
});
