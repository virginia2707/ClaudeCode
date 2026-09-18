import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { createGame } from "@/lib/game/create";
import { joinGame } from "@/lib/game/join";
import { startGame, submitAnswer, useJoker, jokerEffects, closeQuestion, advance, finishGame } from "@/lib/game/engine";
import { buildPublicState } from "@/lib/game/state";
import { fiftyFiftyHidden } from "@/lib/game/jokers";

let ownerId: string;
beforeAll(async () => {
  const owner = await prisma.user.create({ data: { email: `jokers-${Date.now()}@test.dev`, name: "Owner", passwordHash: "x", role: "TRAINER", plan: "PRO" } });
  ownerId = owner.id;
});
afterAll(async () => prisma.$disconnect());

async function setup(settings: Record<string, unknown> = {}) {
  const quiz = await prisma.quiz.create({
    data: {
      ownerId,
      title: "Jokers quiz",
      status: "PUBLISHED",
      settings: JSON.stringify({ speedWeight: 0, ...settings }),
      questions: {
        create: [0, 1].map((i) => ({
          order: i,
          text: `Q${i + 1}`,
          timeLimit: 20,
          points: 500,
          answers: { create: ["a", "b", "c", "d"].map((t, ai) => ({ order: ai, text: t, isCorrect: ai === 0 })) },
        })),
      },
    },
  });
  const game = await createGame({ quizId: quiz.id, hostId: ownerId });
  const { player } = await joinGame({ code: game.code, nickname: "Joueur" });
  const { player: other } = await joinGame({ code: game.code, nickname: "Autre" });
  await startGame(game.id);
  const gq = await prisma.gameQuestion.findUniqueOrThrow({ where: { gameId_order: { gameId: game.id, order: 0 } }, include: { question: { include: { answers: { orderBy: { order: "asc" } } } } } });
  return { game, player, other, gq, answers: gq.question.answers };
}

describe("fiftyFiftyHidden", () => {
  const answers = [
    { id: "ok", isCorrect: true },
    { id: "w1", isCorrect: false },
    { id: "w2", isCorrect: false },
    { id: "w3", isCorrect: false },
  ];
  it("hides exactly two wrong answers, never the correct one, deterministically", () => {
    const h = fiftyFiftyHidden(answers, "seed-1");
    expect(h).toHaveLength(2);
    expect(h).not.toContain("ok");
    expect(fiftyFiftyHidden(answers, "seed-1")).toEqual(h);
  });
  it("varies with the seed", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 30; i++) seen.add(fiftyFiftyHidden(answers, `s${i}`).join(","));
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe("jokers", () => {
  it("50/50 hides two wrong answers and is consumed", async () => {
    const { game, player, gq, answers } = await setup();
    const r = await useJoker({ gameId: game.id, playerId: player.id, gameQuestionId: gq.id, type: "FIFTY_FIFTY" });
    expect(r.remaining).toBe(0);
    expect(r.hiddenAnswerIds).toHaveLength(2);
    expect(r.hiddenAnswerIds).not.toContain(answers[0].id);
    const effects = await jokerEffects(player.id, gq.id);
    expect(effects.hiddenAnswerIds).toEqual(r.hiddenAnswerIds);
    // Cannot use twice / no stock left
    await expect(useJoker({ gameId: game.id, playerId: player.id, gameQuestionId: gq.id, type: "FIFTY_FIFTY" })).rejects.toMatchObject({ code: "INVALID" });
    await finishGame(game.id);
  });

  it("Double Points doubles the total of the next correct answer, and is spent even on a wrong answer", async () => {
    const { game, player, other, gq, answers } = await setup();
    await useJoker({ gameId: game.id, playerId: player.id, gameQuestionId: gq.id, type: "DOUBLE_POINTS" });
    const r = await submitAnswer({ gameId: game.id, playerId: player.id, gameQuestionId: gq.id, answerId: answers[0].id });
    expect(r.multiplier).toBe(2);
    expect(r.total).toBe(1000);
    await useJoker({ gameId: game.id, playerId: other.id, gameQuestionId: gq.id, type: "DOUBLE_POINTS" });
    const w = await submitAnswer({ gameId: game.id, playerId: other.id, gameQuestionId: gq.id, answerId: answers[1].id });
    expect(w.total).toBe(0);
    expect((await prisma.playerJoker.findUniqueOrThrow({ where: { gamePlayerId_type: { gamePlayerId: other.id, type: "DOUBLE_POINTS" } } })).remaining).toBe(0);
    await finishGame(game.id);
  });

  it("jokers cannot be armed after answering", async () => {
    const { game, player, gq, answers } = await setup();
    await submitAnswer({ gameId: game.id, playerId: player.id, gameQuestionId: gq.id, answerId: answers[0].id });
    await expect(useJoker({ gameId: game.id, playerId: player.id, gameQuestionId: gq.id, type: "EXTRA_TIME" })).rejects.toThrow(/avant de répondre/);
    await finishGame(game.id);
  });

  it("Extra Time extends the player's deadline and the server-side close", async () => {
    const { game, player, gq, answers } = await setup({ extraTimeSeconds: 10 });
    const r = await useJoker({ gameId: game.id, playerId: player.id, gameQuestionId: gq.id, type: "EXTRA_TIME" });
    expect(r.extraMs).toBe(10_000);
    const g = await prisma.game.findUniqueOrThrow({ where: { id: game.id } });
    expect(g.questionEndsAt!.getTime() - gq.endsAt!.getTime()).toBe(10_000);
    // Simulate answering 25 s after start: late for others, fine with +10 s
    const startedAt = new Date(Date.now() - 25_000);
    await prisma.gameQuestion.update({ where: { id: gq.id }, data: { startedAt, endsAt: new Date(startedAt.getTime() + 20_000) } });
    await prisma.game.update({ where: { id: game.id }, data: { questionStartedAt: startedAt, questionEndsAt: new Date(startedAt.getTime() + 30_000) } });
    const a = await submitAnswer({ gameId: game.id, playerId: player.id, gameQuestionId: gq.id, answerId: answers[0].id });
    expect(a.accepted).toBe(true);
    expect(a.total).toBe(500);
    await finishGame(game.id);
  });

  it("Second Chance allows one retry after a wrong first answer, keeping the streak", async () => {
    const { game, player, gq, answers } = await setup();
    await prisma.gamePlayer.update({ where: { id: player.id }, data: { streak: 2 } });
    await useJoker({ gameId: game.id, playerId: player.id, gameQuestionId: gq.id, type: "SECOND_CHANCE" });
    const first = await submitAnswer({ gameId: game.id, playerId: player.id, gameQuestionId: gq.id, answerId: answers[2].id });
    expect(first).toMatchObject({ correct: false, total: 0, retryAllowed: true, streakAfter: 2 });
    expect((await buildPublicState(game.id))?.status).toBe("QUESTION");
    const second = await submitAnswer({ gameId: game.id, playerId: player.id, gameQuestionId: gq.id, answerId: answers[0].id });
    expect(second).toMatchObject({ correct: true, streakAfter: 3, retryAllowed: false });
    expect(second.total).toBe(500 + 100);
    // Third attempt refused
    await expect(submitAnswer({ gameId: game.id, playerId: player.id, gameQuestionId: gq.id, answerId: answers[1].id })).rejects.toMatchObject({ code: "DUPLICATE" });
    const ledger = await prisma.playerAnswer.findUniqueOrThrow({ where: { gamePlayerId_gameQuestionId: { gamePlayerId: player.id, gameQuestionId: gq.id } } });
    expect(ledger.attempts).toBe(2);
    expect(ledger.pointsAwarded).toBe(600);
    const p = await prisma.gamePlayer.findUniqueOrThrow({ where: { id: player.id } });
    expect(p.score).toBe(600);
    expect(p.answeredCount).toBe(1);
    await closeQuestion(game.id, gq.id);
    await advance(game.id);
    await finishGame(game.id);
  });

  it("refuses jokers when the quiz disables them", async () => {
    const { game, player, gq } = await setup({ jokersEnabled: false });
    await expect(useJoker({ gameId: game.id, playerId: player.id, gameQuestionId: gq.id, type: "FIFTY_FIFTY" })).rejects.toThrow(/désactivés/);
    await finishGame(game.id);
  });
});
