import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { createGame } from "@/lib/game/create";
import { joinGame, JoinError } from "@/lib/game/join";
import { startGame, submitAnswer, closeQuestion, advance, finishGame, reconcileGame, pauseGame, resumeGame, EngineError } from "@/lib/game/engine";
import { buildPublicState } from "@/lib/game/state";
import { getBus } from "@/lib/realtime/bus";
import type { GameEvent } from "@/lib/realtime/events";

const QUESTIONS = [
  { text: "Q1 — capital of France?", answers: ["Paris", "Rome", "Berlin", "Madrid"], correct: 0 },
  { text: "Q2 — 2 + 2 = ?", answers: ["3", "4", "5", "6"], correct: 1 },
  { text: "Q3 — colour of the sky?", answers: ["Green", "Red", "Blue", "Black"], correct: 2 },
];

async function makeQuiz(ownerId: string, settings: Record<string, unknown> = {}) {
  return prisma.quiz.create({
    data: {
      ownerId,
      title: "Engine test quiz",
      status: "PUBLISHED",
      settings: JSON.stringify(settings),
      questions: {
        create: QUESTIONS.map((q, i) => ({
          order: i,
          text: q.text,
          timeLimit: 20,
          points: 500,
          answers: { create: q.answers.map((t, ai) => ({ order: ai, text: t, isCorrect: ai === q.correct })) },
        })),
      },
    },
    include: { questions: { orderBy: { order: "asc" }, include: { answers: { orderBy: { order: "asc" } } } } },
  });
}

/** Simulate that the current question started `ms` ago (server-measured elapsed time). */
async function rewindQuestionStart(gameId: string, ms: number) {
  const game = await prisma.game.findUniqueOrThrow({ where: { id: gameId } });
  const gq = await prisma.gameQuestion.findUniqueOrThrow({ where: { gameId_order: { gameId, order: game.currentIndex } } });
  const startedAt = new Date(Date.now() - ms);
  const endsAt = new Date(startedAt.getTime() + 20_000);
  await prisma.gameQuestion.update({ where: { id: gq.id }, data: { startedAt, endsAt } });
  await prisma.game.update({ where: { id: gameId }, data: { questionStartedAt: startedAt, questionEndsAt: endsAt } });
  return gq;
}

async function currentGq(gameId: string) {
  const game = await prisma.game.findUniqueOrThrow({ where: { id: gameId } });
  return prisma.gameQuestion.findUniqueOrThrow({ where: { gameId_order: { gameId, order: game.currentIndex } }, include: { question: { include: { answers: { orderBy: { order: "asc" } } } } } });
}

let ownerId: string;
beforeAll(async () => {
  const owner = await prisma.user.create({ data: { email: `owner-${Date.now()}@test.dev`, name: "Owner", passwordHash: "x", role: "TRAINER", plan: "PRO" } });
  ownerId = owner.id;
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe("GameEngine — individual game end to end", () => {
  it("runs a full game with server-side scoring", async () => {
    const quiz = await makeQuiz(ownerId);
    const game = await createGame({ quizId: quiz.id, hostId: ownerId });
    expect(game.code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
    expect(await prisma.gameQuestion.count({ where: { gameId: game.id } })).toBe(3);

    const events: GameEvent[] = [];
    const unsub = getBus().subscribe(game.id, (e) => events.push(e));

    const { player: alice } = await joinGame({ code: game.code, nickname: "Alice" });
    const { player: bob } = await joinGame({ code: game.code, nickname: "Bob" });
    const { player: carol } = await joinGame({ code: game.code, nickname: "Carol" });
    await expect(joinGame({ code: game.code, nickname: "alice" })).rejects.toBeInstanceOf(JoinError);
    await expect(joinGame({ code: "ZZZZZZ", nickname: "Nobody" })).rejects.toBeInstanceOf(JoinError);

    // Each player received the jokers configured by default
    expect(await prisma.playerJoker.count({ where: { gamePlayerId: alice.id } })).toBe(4);

    await startGame(game.id);
    let state = await buildPublicState(game.id);
    expect(state?.status).toBe("QUESTION");
    expect(state?.question?.index).toBe(0);
    expect(state?.question?.answers.map((a) => a.text)).toEqual(QUESTIONS[0].answers);
    // The public question view never leaks the correct answer
    expect(JSON.stringify(state?.question)).not.toContain("isCorrect");
    await expect(joinGame({ code: game.code, nickname: "Late" })).rejects.toThrow(/déjà commencé/);

    // Q1: Alice correct after 3 s → 925, Bob wrong, Carol silent.
    let gq = await rewindQuestionStart(game.id, 3_000);
    const a1 = await submitAnswer({ gameId: game.id, playerId: alice.id, gameQuestionId: gq.id, answerId: gq.id && (await currentGq(game.id)).question.answers[0].id });
    expect(a1).toMatchObject({ accepted: true, correct: true, basePoints: 500, streakBonus: 0, multiplier: 1, streakAfter: 1 });
    expect(a1.speedBonus).toBeGreaterThanOrEqual(420);
    expect(a1.speedBonus).toBeLessThanOrEqual(425);
    expect(a1.total).toBe(500 + a1.speedBonus);

    // One answer per player per question
    const wrongId = (await currentGq(game.id)).question.answers[1].id;
    await expect(submitAnswer({ gameId: game.id, playerId: alice.id, gameQuestionId: gq.id, answerId: wrongId })).rejects.toMatchObject({ code: "DUPLICATE" });
    // Invalid answer id
    await expect(submitAnswer({ gameId: game.id, playerId: bob.id, gameQuestionId: gq.id, answerId: "nope" })).rejects.toMatchObject({ code: "INVALID" });
    const b1 = await submitAnswer({ gameId: game.id, playerId: bob.id, gameQuestionId: gq.id, answerId: wrongId });
    expect(b1).toMatchObject({ correct: false, total: 0, streakAfter: 0 });

    // Give Carol a streak to verify silence resets it
    await prisma.gamePlayer.update({ where: { id: carol.id }, data: { streak: 2 } });
    await closeQuestion(game.id, gq.id);
    state = await buildPublicState(game.id);
    expect(state?.status).toBe("REVEAL");
    expect(state?.reveal?.correctAnswerId).toBe((await currentGq(game.id)).question.answers[0].id);
    expect(state?.reveal?.distribution).toMatchObject({ [wrongId]: 1 });
    expect((await prisma.gamePlayer.findUniqueOrThrow({ where: { id: carol.id } })).streak).toBe(0);
    // Closing twice is a no-op
    await closeQuestion(game.id, gq.id);
    expect((await buildPublicState(game.id))?.status).toBe("REVEAL");

    // REVEAL → LEADERBOARD (showLeaderboard default true) → Q2
    await advance(game.id);
    expect((await buildPublicState(game.id))?.status).toBe("LEADERBOARD");
    await advance(game.id);
    state = await buildPublicState(game.id);
    expect(state?.status).toBe("QUESTION");
    expect(state?.currentIndex).toBe(1);
    // previousRank recorded for ↑/↓ indicators
    expect(state?.players.find((p) => p.id === alice.id)?.previousRank).toBe(1);

    // Q2: Alice correct again after 10 s → 500 + 250 + 50 (streak 2)
    gq = await rewindQuestionStart(game.id, 10_000);
    const correct2 = (await currentGq(game.id)).question.answers[1].id;
    const a2 = await submitAnswer({ gameId: game.id, playerId: alice.id, gameQuestionId: gq.id, answerId: correct2 });
    expect(a2.streakAfter).toBe(2);
    expect(a2.streakBonus).toBe(50);
    expect(a2.total).toBe(500 + a2.speedBonus + 50);
    // Bob answers late (21 s): accepted=false, 0 points
    await rewindQuestionStart(game.id, 21_000);
    const b2 = await submitAnswer({ gameId: game.id, playerId: bob.id, gameQuestionId: gq.id, answerId: correct2 });
    expect(b2).toMatchObject({ accepted: false, total: 0, streakAfter: 0 });

    // Pause during a question shifts the deadline by the pause duration
    await rewindQuestionStart(game.id, 5_000);
    const before = (await prisma.game.findUniqueOrThrow({ where: { id: game.id } })).questionEndsAt!.getTime();
    await pauseGame(game.id);
    expect((await buildPublicState(game.id))?.status).toBe("PAUSED");
    await expect(advance(game.id)).rejects.toBeInstanceOf(EngineError);
    await new Promise((r) => setTimeout(r, 300));
    await resumeGame(game.id);
    const after = (await prisma.game.findUniqueOrThrow({ where: { id: game.id } })).questionEndsAt!.getTime();
    expect(after - before).toBeGreaterThanOrEqual(250);
    expect((await buildPublicState(game.id))?.status).toBe("QUESTION");

    // Reconciliation closes an expired question even without the in-memory timer
    await rewindQuestionStart(game.id, 25_000);
    await reconcileGame(game.id);
    expect((await buildPublicState(game.id))?.status).toBe("REVEAL");
    await expect(submitAnswer({ gameId: game.id, playerId: carol.id, gameQuestionId: gq.id, answerId: correct2 })).rejects.toMatchObject({ code: "CLOSED" });

    // Q3 then finish
    await advance(game.id); // leaderboard
    await advance(game.id); // question 3
    gq = await rewindQuestionStart(game.id, 1_000);
    const correct3 = (await currentGq(game.id)).question.answers[2].id;
    const a3 = await submitAnswer({ gameId: game.id, playerId: alice.id, gameQuestionId: gq.id, answerId: correct3 });
    expect(a3.streakAfter).toBe(3);
    expect(a3.streakBonus).toBe(100);
    await closeQuestion(game.id, gq.id);
    await advance(game.id); // last question: REVEAL → FINISHED directly
    state = await buildPublicState(game.id);
    expect(state?.status).toBe("FINISHED");

    const results = await prisma.gameResult.findMany({ where: { gameId: game.id }, orderBy: { rank: "asc" } });
    expect(results.map((r) => r.rank)).toEqual([1, 2, 3]);
    expect(results[0].gamePlayerId).toBe(alice.id);
    expect(results[0].correctCount).toBe(3);
    expect(results[0].bestStreak).toBe(3);
    expect(results[0].xpEarned).toBe(results[0].score);
    expect(results[0].levelName).toBe("Competitor"); // ≥ 2 500 XP
    const bobResult = results.find((r) => r.gamePlayerId === bob.id)!;
    expect(bobResult.answeredCount).toBe(2);
    expect(bobResult.correctCount).toBe(1); // late correct answer counts as correct but 0 points
    expect(bobResult.score).toBe(0);
    expect(await prisma.xPTransaction.count({ where: { gamePlayerId: alice.id } })).toBe(1);
    // finish is idempotent
    await finishGame(game.id);
    expect(await prisma.gameResult.count({ where: { gameId: game.id } })).toBe(3);

    const types = events.map((e) => e.type);
    expect(types).toContain("question_started");
    expect(types).toContain("question_ended");
    expect(types).toContain("leaderboard");
    expect(types[types.length - 1]).toBe("game_finished");
    unsub();
  });

  it("closes the question automatically when every connected player has answered", async () => {
    const quiz = await makeQuiz(ownerId, { showLeaderboard: false });
    const game = await createGame({ quizId: quiz.id, hostId: ownerId });
    const { player: p1 } = await joinGame({ code: game.code, nickname: "P1" });
    const { player: p2 } = await joinGame({ code: game.code, nickname: "P2" });
    await startGame(game.id);
    const gq = await currentGq(game.id);
    await submitAnswer({ gameId: game.id, playerId: p1.id, gameQuestionId: gq.id, answerId: gq.question.answers[0].id });
    expect((await buildPublicState(game.id))?.status).toBe("QUESTION");
    await submitAnswer({ gameId: game.id, playerId: p2.id, gameQuestionId: gq.id, answerId: gq.question.answers[0].id });
    await new Promise((r) => setTimeout(r, 200));
    expect((await buildPublicState(game.id))?.status).toBe("REVEAL");
    // showLeaderboard=false: REVEAL → next question directly
    await advance(game.id);
    expect((await buildPublicState(game.id))?.status).toBe("QUESTION");
    await finishGame(game.id);
  });

  it("applies quiz settings: speedWeight 0, penalty, custom streak table", async () => {
    const quiz = await makeQuiz(ownerId, { speedWeight: 0, wrongAnswerPenalty: 100, streakBonuses: [0, 25], jokersEnabled: false });
    const game = await createGame({ quizId: quiz.id, hostId: ownerId });
    const { player: p } = await joinGame({ code: game.code, nickname: "Solo" });
    expect(await prisma.playerJoker.count({ where: { gamePlayerId: p.id } })).toBe(0);
    await startGame(game.id);
    let gq = await rewindQuestionStart(game.id, 1_000);
    let cur = await currentGq(game.id);
    const r1 = await submitAnswer({ gameId: game.id, playerId: p.id, gameQuestionId: gq.id, answerId: cur.question.answers[QUESTIONS[0].correct].id });
    expect(r1.speedBonus).toBe(0);
    expect(r1.total).toBe(500);
    await closeQuestion(game.id, gq.id);
    await advance(game.id);
    await advance(game.id);
    gq = await rewindQuestionStart(game.id, 1_000);
    cur = await currentGq(game.id);
    const r2 = await submitAnswer({ gameId: game.id, playerId: p.id, gameQuestionId: gq.id, answerId: cur.question.answers[QUESTIONS[1].correct].id });
    expect(r2.streakBonus).toBe(25);
    await closeQuestion(game.id, gq.id);
    await advance(game.id);
    await advance(game.id);
    gq = await rewindQuestionStart(game.id, 1_000);
    cur = await currentGq(game.id);
    const r3 = await submitAnswer({ gameId: game.id, playerId: p.id, gameQuestionId: gq.id, answerId: cur.question.answers[0].id }); // wrong
    expect(r3.total).toBe(-100);
    const player = await prisma.gamePlayer.findUniqueOrThrow({ where: { id: p.id } });
    expect(player.score).toBe(500 + 525 - 100);
    await finishGame(game.id);
  });
});

describe("GameEngine — team mode", () => {
  it("sums member scores into team scores and ranks teams", async () => {
    const quiz = await makeQuiz(ownerId, { mode: "TEAM", teamNames: ["Alpha", "Bravo"], speedWeight: 0 });
    const game = await createGame({ quizId: quiz.id, hostId: ownerId });
    const teams = await prisma.team.findMany({ where: { gameId: game.id }, orderBy: { name: "asc" } });
    expect(teams.map((t) => t.name)).toEqual(["Alpha", "Bravo"]);
    await expect(joinGame({ code: game.code, nickname: "NoTeam" })).rejects.toMatchObject({ field: "teamId" });
    const { player: a1 } = await joinGame({ code: game.code, nickname: "A1", teamId: teams[0].id });
    const { player: a2 } = await joinGame({ code: game.code, nickname: "A2", teamId: teams[0].id });
    const { player: b1 } = await joinGame({ code: game.code, nickname: "B1", teamId: teams[1].id });
    await startGame(game.id);
    const gq = await currentGq(game.id);
    const correct = gq.question.answers[0].id;
    const wrong = gq.question.answers[1].id;
    await submitAnswer({ gameId: game.id, playerId: a1.id, gameQuestionId: gq.id, answerId: correct });
    await submitAnswer({ gameId: game.id, playerId: a2.id, gameQuestionId: gq.id, answerId: correct });
    await submitAnswer({ gameId: game.id, playerId: b1.id, gameQuestionId: gq.id, answerId: wrong });
    await new Promise((r) => setTimeout(r, 200));
    const state = await buildPublicState(game.id);
    expect(state?.status).toBe("REVEAL");
    expect(state?.teams.map((t) => [t.name, t.score, t.rank])).toEqual([
      ["Alpha", 1000, 1],
      ["Bravo", 0, 2],
    ]);
    await finishGame(game.id);
  });
});
