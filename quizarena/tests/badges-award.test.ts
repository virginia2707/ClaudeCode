import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { createGame } from "@/lib/game/create";
import { joinGame } from "@/lib/game/join";
import { startGame, submitAnswer, closeQuestion, advance, finishGame } from "@/lib/game/engine";
import { seedBadges } from "../prisma/seed-badges";

let ownerId: string;
let learnerId: string;
beforeAll(async () => {
  const owner = await prisma.user.create({ data: { email: `badges-owner-${Date.now()}@test.dev`, name: "Owner", passwordHash: "x", role: "TRAINER", plan: "PRO" } });
  ownerId = owner.id;
  const learner = await prisma.user.create({ data: { email: `badges-learner-${Date.now()}@test.dev`, name: "Learner", passwordHash: "x", role: "LEARNER" } });
  learnerId = learner.id;
  await seedBadges(prisma);
});
afterAll(async () => prisma.$disconnect());

async function currentGq(gameId: string) {
  const game = await prisma.game.findUniqueOrThrow({ where: { id: gameId } });
  return prisma.gameQuestion.findUniqueOrThrow({
    where: { gameId_order: { gameId, order: game.currentIndex } },
    include: { question: { include: { answers: { orderBy: { order: "asc" } } } } },
  });
}

describe("awardBadges (via finishGame)", () => {
  it("awards Perfect Round + Consistent Player + Fast Thinker + Speed Demon + Quiz Champion + Top 3 + First Victory to a flawless fast winner, and nothing spurious to a silent last player", async () => {
    const quiz = await prisma.quiz.create({
      data: {
        ownerId,
        title: "Badges quiz",
        status: "PUBLISHED",
        settings: JSON.stringify({ speedWeight: 0, showLeaderboard: false }),
        questions: {
          create: [0, 1].map((i) => ({
            order: i,
            text: `Q${i + 1}`,
            timeLimit: 20,
            points: 500,
            answers: { create: ["ok", "no1", "no2", "no3"].map((t, ai) => ({ order: ai, text: t, isCorrect: ai === 0 })) },
          })),
        },
      },
    });
    const game = await createGame({ quizId: quiz.id, hostId: ownerId });
    const { player: winner } = await joinGame({ code: game.code, nickname: "Winner", userId: learnerId });
    const { player: last } = await joinGame({ code: game.code, nickname: "Last" });
    const { player: mid } = await joinGame({ code: game.code, nickname: "Mid" });
    const { player: mid2 } = await joinGame({ code: game.code, nickname: "Mid2" });
    await startGame(game.id);

    // Q1: winner, mid and mid2 correct fast; last silent (times out) → 4-player field, last ranks 4th
    let gq = await currentGq(game.id);
    await submitAnswer({ gameId: game.id, playerId: winner.id, gameQuestionId: gq.id, answerId: gq.question.answers[0].id });
    await submitAnswer({ gameId: game.id, playerId: mid.id, gameQuestionId: gq.id, answerId: gq.question.answers[0].id });
    await submitAnswer({ gameId: game.id, playerId: mid2.id, gameQuestionId: gq.id, answerId: gq.question.answers[0].id });
    await closeQuestion(game.id, gq.id);
    await advance(game.id);

    // Q2: same pattern
    gq = await currentGq(game.id);
    await submitAnswer({ gameId: game.id, playerId: winner.id, gameQuestionId: gq.id, answerId: gq.question.answers[0].id });
    await submitAnswer({ gameId: game.id, playerId: mid.id, gameQuestionId: gq.id, answerId: gq.question.answers[0].id });
    await submitAnswer({ gameId: game.id, playerId: mid2.id, gameQuestionId: gq.id, answerId: gq.question.answers[0].id });
    await closeQuestion(game.id, gq.id);
    await advance(game.id); // last question, no leaderboard → FINISHED

    const results = await prisma.gameResult.findMany({ where: { gameId: game.id }, orderBy: { rank: "asc" } });
    expect(results[0].gamePlayerId).toBe(winner.id);
    expect(results[results.length - 1].gamePlayerId).toBe(last.id);

    const winnerBadges = await prisma.playerBadge.findMany({ where: { gamePlayerId: winner.id }, include: { badge: true } });
    const winnerCodes = winnerBadges.map((b) => b.badge.code).sort();
    expect(winnerCodes).toEqual(
      ["FAST_THINKER", "FIRST_VICTORY", "PERFECT_ROUND", "QUIZ_CHAMPION", "SPEED_DEMON", "TOP_3", "CONSISTENT_PLAYER"].sort(),
    );
    expect(winnerBadges.every((b) => b.userId === learnerId)).toBe(true);

    // The silent last player answered nothing: no accuracy/streak/speed badges.
    const lastBadges = await prisma.playerBadge.findMany({ where: { gamePlayerId: last.id }, include: { badge: true } });
    expect(lastBadges.map((b) => b.badge.code)).toEqual([]);

    // Re-running finishGame (idempotent) must not duplicate badges.
    await finishGame(game.id);
    const winnerBadgesAgain = await prisma.playerBadge.findMany({ where: { gamePlayerId: winner.id } });
    expect(winnerBadgesAgain).toHaveLength(winnerBadges.length);

    // Playing a second game: the signed-in winner should NOT get First Victory again.
    const game2 = await createGame({ quizId: quiz.id, hostId: ownerId });
    const { player: winner2 } = await joinGame({ code: game2.code, nickname: "Winner", userId: learnerId });
    const { player: other2 } = await joinGame({ code: game2.code, nickname: "Rival" });
    await startGame(game2.id);
    let gq2 = await currentGq(game2.id);
    await submitAnswer({ gameId: game2.id, playerId: winner2.id, gameQuestionId: gq2.id, answerId: gq2.question.answers[0].id });
    await submitAnswer({ gameId: game2.id, playerId: other2.id, gameQuestionId: gq2.id, answerId: gq2.question.answers[1].id });
    await closeQuestion(game2.id, gq2.id);
    await advance(game2.id);
    gq2 = await currentGq(game2.id);
    await submitAnswer({ gameId: game2.id, playerId: winner2.id, gameQuestionId: gq2.id, answerId: gq2.question.answers[0].id });
    await submitAnswer({ gameId: game2.id, playerId: other2.id, gameQuestionId: gq2.id, answerId: gq2.question.answers[1].id });
    await closeQuestion(game2.id, gq2.id);
    await advance(game2.id);
    const winner2Badges = await prisma.playerBadge.findMany({ where: { gamePlayerId: winner2.id }, include: { badge: true } });
    expect(winner2Badges.map((b) => b.badge.code)).not.toContain("FIRST_VICTORY");
    expect(winner2Badges.map((b) => b.badge.code)).toContain("QUIZ_CHAMPION");
  });

  it("awards Team Player only to members of the winning team", async () => {
    const quiz = await prisma.quiz.create({
      data: {
        ownerId,
        title: "Team badges quiz",
        status: "PUBLISHED",
        settings: JSON.stringify({ mode: "TEAM", teamNames: ["Alpha", "Bravo"], speedWeight: 0 }),
        questions: {
          create: [{ order: 0, text: "Q1", timeLimit: 20, points: 500, answers: { create: ["ok", "no1", "no2", "no3"].map((t, ai) => ({ order: ai, text: t, isCorrect: ai === 0 })) } }],
        },
      },
    });
    const game = await createGame({ quizId: quiz.id, hostId: ownerId });
    const teams = await prisma.team.findMany({ where: { gameId: game.id }, orderBy: { name: "asc" } });
    const { player: a1 } = await joinGame({ code: game.code, nickname: "A1", teamId: teams[0].id });
    const { player: b1 } = await joinGame({ code: game.code, nickname: "B1", teamId: teams[1].id });
    await startGame(game.id);
    const gq = await currentGq(game.id);
    await submitAnswer({ gameId: game.id, playerId: a1.id, gameQuestionId: gq.id, answerId: gq.question.answers[0].id });
    await submitAnswer({ gameId: game.id, playerId: b1.id, gameQuestionId: gq.id, answerId: gq.question.answers[1].id });
    await closeQuestion(game.id, gq.id);
    await advance(game.id);

    const a1Badges = await prisma.playerBadge.findMany({ where: { gamePlayerId: a1.id }, include: { badge: true } });
    const b1Badges = await prisma.playerBadge.findMany({ where: { gamePlayerId: b1.id }, include: { badge: true } });
    expect(a1Badges.map((b) => b.badge.code)).toContain("TEAM_PLAYER");
    expect(b1Badges.map((b) => b.badge.code)).not.toContain("TEAM_PLAYER");
  });

  it("awards Comeback when a player's rank jumps on the final question", async () => {
    const quiz = await prisma.quiz.create({
      data: {
        ownerId,
        title: "Comeback quiz",
        status: "PUBLISHED",
        settings: JSON.stringify({ speedWeight: 0, showLeaderboard: false }),
        questions: {
          create: [0, 1].map((i) => ({
            order: i,
            text: `Q${i + 1}`,
            timeLimit: 20,
            points: 500,
            answers: { create: ["ok", "no1", "no2", "no3"].map((t, ai) => ({ order: ai, text: t, isCorrect: ai === 0 })) },
          })),
        },
      },
    });
    const game = await createGame({ quizId: quiz.id, hostId: ownerId });
    const { player: laggard } = await joinGame({ code: game.code, nickname: "Laggard" });
    const { player: p2 } = await joinGame({ code: game.code, nickname: "P2" });
    const { player: p3 } = await joinGame({ code: game.code, nickname: "P3" });
    const { player: p4 } = await joinGame({ code: game.code, nickname: "P4" });
    await startGame(game.id);
    // Q1: everyone except laggard answers correctly, so laggard is last (rank 4) before Q2 starts.
    let gq = await currentGq(game.id);
    await submitAnswer({ gameId: game.id, playerId: p2.id, gameQuestionId: gq.id, answerId: gq.question.answers[0].id });
    await submitAnswer({ gameId: game.id, playerId: p3.id, gameQuestionId: gq.id, answerId: gq.question.answers[0].id });
    await submitAnswer({ gameId: game.id, playerId: p4.id, gameQuestionId: gq.id, answerId: gq.question.answers[0].id });
    await closeQuestion(game.id, gq.id);
    await advance(game.id); // records previousRank=4 for laggard when Q2 starts

    // Q2: laggard alone answers correctly and fast → jumps to rank 1.
    gq = await currentGq(game.id);
    await submitAnswer({ gameId: game.id, playerId: laggard.id, gameQuestionId: gq.id, answerId: gq.question.answers[0].id });
    await submitAnswer({ gameId: game.id, playerId: p2.id, gameQuestionId: gq.id, answerId: gq.question.answers[1].id });
    await submitAnswer({ gameId: game.id, playerId: p3.id, gameQuestionId: gq.id, answerId: gq.question.answers[1].id });
    await submitAnswer({ gameId: game.id, playerId: p4.id, gameQuestionId: gq.id, answerId: gq.question.answers[1].id });
    await closeQuestion(game.id, gq.id);
    await advance(game.id);

    const laggardResult = await prisma.gameResult.findUniqueOrThrow({ where: { gamePlayerId: laggard.id } });
    expect(laggardResult.rank).toBe(1);
    const badges = await prisma.playerBadge.findMany({ where: { gamePlayerId: laggard.id }, include: { badge: true } });
    expect(badges.map((b) => b.badge.code)).toContain("COMEBACK");
  });
});
