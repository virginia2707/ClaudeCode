import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { createGame } from "@/lib/game/create";
import { joinGame } from "@/lib/game/join";
import { startGame, submitAnswer, closeQuestion, advance, finishGame } from "@/lib/game/engine";
import { computeGameReport } from "@/lib/game/report";

let ownerId: string;
beforeAll(async () => {
  const owner = await prisma.user.create({ data: { email: `report-${Date.now()}@test.dev`, name: "Owner", passwordHash: "x", role: "TRAINER", plan: "PRO" } });
  ownerId = owner.id;
});
afterAll(async () => prisma.$disconnect());

async function currentGq(gameId: string) {
  const game = await prisma.game.findUniqueOrThrow({ where: { id: gameId } });
  return prisma.gameQuestion.findUniqueOrThrow({
    where: { gameId_order: { gameId, order: game.currentIndex } },
    include: { question: { include: { answers: { orderBy: { order: "asc" } } } } },
  });
}

describe("computeGameReport", () => {
  it("computes participants, averages, per-question stats, hardest/easiest and the review list", async () => {
    const quiz = await prisma.quiz.create({
      data: {
        ownerId,
        title: "Report quiz",
        status: "PUBLISHED",
        settings: JSON.stringify({ speedWeight: 0, showLeaderboard: false }),
        questions: {
          create: [
            { order: 0, text: "Easy question", category: "Basics", timeLimit: 20, points: 500, answers: { create: [{ order: 0, text: "ok", isCorrect: true }, { order: 1, text: "no", isCorrect: false }, { order: 2, text: "no2", isCorrect: false }, { order: 3, text: "no3", isCorrect: false }] } },
            { order: 1, text: "Hard question", category: "Advanced", timeLimit: 20, points: 500, answers: { create: [{ order: 0, text: "ok", isCorrect: true }, { order: 1, text: "no", isCorrect: false }, { order: 2, text: "no2", isCorrect: false }, { order: 3, text: "no3", isCorrect: false }] } },
          ],
        },
      },
    });
    const game = await createGame({ quizId: quiz.id, hostId: ownerId });
    const { player: alice } = await joinGame({ code: game.code, nickname: "Alice" });
    const { player: bob } = await joinGame({ code: game.code, nickname: "Bob" });
    const { player: carol } = await joinGame({ code: game.code, nickname: "Carol" });
    await startGame(game.id);

    // Q1 (easy): all three correct
    let gq = await currentGq(game.id);
    const okId = gq.question.answers[0].id;
    const wrongId = gq.question.answers[1].id;
    await submitAnswer({ gameId: game.id, playerId: alice.id, gameQuestionId: gq.id, answerId: okId });
    await submitAnswer({ gameId: game.id, playerId: bob.id, gameQuestionId: gq.id, answerId: okId });
    await submitAnswer({ gameId: game.id, playerId: carol.id, gameQuestionId: gq.id, answerId: okId });
    await closeQuestion(game.id, gq.id);
    await advance(game.id); // no leaderboard configured → straight to Q2

    // Q2 (hard): only Alice correct
    gq = await currentGq(game.id);
    const okId2 = gq.question.answers[0].id;
    const wrongId2 = gq.question.answers[1].id;
    await submitAnswer({ gameId: game.id, playerId: alice.id, gameQuestionId: gq.id, answerId: okId2 });
    await submitAnswer({ gameId: game.id, playerId: bob.id, gameQuestionId: gq.id, answerId: wrongId2 });
    await submitAnswer({ gameId: game.id, playerId: carol.id, gameQuestionId: gq.id, answerId: wrongId2 });
    await closeQuestion(game.id, gq.id);
    await advance(game.id); // last question → FINISHED

    const report = await computeGameReport(game.id);
    expect(report).not.toBeNull();
    expect(report!.participants).toBe(3);
    // Alice: 500 (Q1, streak 1 → +0) + 550 (Q2, streak 2 → +50) = 1050; Bob: 500; Carol: 500 → avg 683.33, median 500
    expect(report!.avgScore).toBeCloseTo((1050 + 500 + 500) / 3, 1);
    expect(report!.medianScore).toBe(500);
    expect(report!.questions).toHaveLength(2);
    expect(report!.questions[0].successRate).toBe(1); // 3/3
    expect(report!.questions[1].successRate).toBeCloseTo(1 / 3);
    expect(report!.hardestQuestion?.order).toBe(1);
    expect(report!.easiestQuestion?.order).toBe(0);
    expect(report!.questionsToReview.map((q) => q.order)).toEqual([1]);
    expect(report!.scoreDistribution.reduce((s, b) => s + b.count, 0)).toBe(3);
    expect(report!.avgAccuracy).toBeCloseTo((1 + 0.5 + 0.5) / 3);

    // finishGame persists the same numbers into QuizResult
    await finishGame(game.id); // idempotent if already finished by advance()
    const stored = await prisma.quizResult.findUnique({ where: { gameId: game.id } });
    expect(stored).not.toBeNull();
    expect(stored!.participants).toBe(3);
    expect(JSON.parse(stored!.stats).questionsToReview).toHaveLength(1);
    void wrongId;
  });

  it("returns null successRate for a question nobody answered, and null hardest/easiest when there is no data", async () => {
    const quiz = await prisma.quiz.create({
      data: {
        ownerId,
        title: "Empty quiz",
        status: "PUBLISHED",
        questions: {
          create: [{ order: 0, text: "Unanswered", timeLimit: 20, points: 500, answers: { create: [{ order: 0, text: "a", isCorrect: true }, { order: 1, text: "b", isCorrect: false }, { order: 2, text: "c", isCorrect: false }, { order: 3, text: "d", isCorrect: false }] } }],
        },
      },
    });
    const game = await createGame({ quizId: quiz.id, hostId: ownerId });
    await joinGame({ code: game.code, nickname: "Solo" });
    await startGame(game.id);
    const gq = await currentGq(game.id);
    await closeQuestion(game.id, gq.id); // nobody answers before close
    await advance(game.id);
    const report = await computeGameReport(game.id);
    expect(report!.questions[0].successRate).toBeNull();
    expect(report!.hardestQuestion).toBeNull();
    expect(report!.easiestQuestion).toBeNull();
    expect(report!.questionsToReview).toHaveLength(0);
  });
});
