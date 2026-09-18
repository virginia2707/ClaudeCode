import "server-only";
import { prisma } from "@/lib/db/prisma";
import { parseSettings, type QuizSettings } from "@/lib/validation/quiz";
import { getBus } from "@/lib/realtime/bus";
import { loadPlayerViews, loadQuestionView, loadRevealView, rankPlayers } from "./state";
import { scoreAnswer, xpForScore } from "./scoring";
import { levelFor } from "./levels";
import { track } from "@/lib/analytics";
import type { JokerType } from "@/lib/constants";

/**
 * GameEngine — the server-side state machine. The server is the single source
 * of truth: statuses, deadlines, answers and scores all live in the database;
 * clients only receive events and submit answers.
 *
 *   LOBBY → QUESTION → REVEAL → (LEADERBOARD) → QUESTION … → FINISHED
 *                 ↕ PAUSED
 */

export class EngineError extends Error {
  constructor(message: string, public code = "ENGINE") {
    super(message);
  }
}

// ---------------------------------------------------------------------------
// Server-side timers (in-memory, per process). `reconcileGame` is the safety
// net when a timer is lost (restart): any read closes an expired question.
// ---------------------------------------------------------------------------
const g = globalThis as unknown as { __qaTimers?: Map<string, ReturnType<typeof setTimeout>> };
function timers() {
  if (!g.__qaTimers) g.__qaTimers = new Map();
  return g.__qaTimers;
}
function clearTimer(gameId: string) {
  const t = timers().get(gameId);
  if (t) clearTimeout(t);
  timers().delete(gameId);
}
function scheduleClose(gameId: string, gameQuestionId: string, endsAt: Date, toleranceMs: number) {
  clearTimer(gameId);
  const delay = Math.max(0, endsAt.getTime() - Date.now() + toleranceMs + 50);
  const t = setTimeout(() => {
    timers().delete(gameId);
    closeQuestion(gameId, gameQuestionId).catch((err) => console.error("[engine] auto-close failed", err));
  }, delay);
  timers().set(gameId, t);
}

async function loadGame(gameId: string) {
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) throw new EngineError("Partie introuvable.", "NOT_FOUND");
  return { game, settings: parseSettings(game.settings) };
}

async function recomputeTeamScores(gameId: string) {
  const teams = await prisma.team.findMany({ where: { gameId }, include: { players: { select: { score: true } } } });
  await prisma.$transaction(teams.map((t) => prisma.team.update({ where: { id: t.id }, data: { score: t.players.reduce((a, p) => a + p.score, 0) } })));
}

// ---------------------------------------------------------------------------
// Transitions
// ---------------------------------------------------------------------------

export async function startGame(gameId: string) {
  const { game } = await loadGame(gameId);
  if (game.status !== "LOBBY") throw new EngineError("La partie a déjà démarré.");
  const players = await prisma.gamePlayer.count({ where: { gameId } });
  if (players === 0) throw new EngineError("Aucun participant n'a rejoint la partie.");
  await prisma.game.update({ where: { id: gameId }, data: { startedAt: new Date() } });
  await track("game_started", { userId: game.hostId, gameId, payload: { players } });
  await startQuestion(gameId, 0);
}

export async function startQuestion(gameId: string, index: number) {
  const { game, settings } = await loadGame(gameId);
  const total = await prisma.gameQuestion.count({ where: { gameId } });
  if (index >= total) return finishGame(gameId);

  const gq = await prisma.gameQuestion.findUnique({ where: { gameId_order: { gameId, order: index } }, include: { question: { select: { timeLimit: true } } } });
  if (!gq) throw new EngineError("Question introuvable.");

  // Remember ranks before this question so clients can show ↑/↓ afterwards.
  const players = await prisma.gamePlayer.findMany({ where: { gameId }, select: { id: true, score: true, joinedAt: true } });
  const ranked = rankPlayers(players);
  const now = new Date();
  const endsAt = new Date(now.getTime() + gq.question.timeLimit * 1000);

  await prisma.$transaction([
    ...ranked.map((p) => prisma.gamePlayer.update({ where: { id: p.id }, data: { previousRank: p.rank } })),
    prisma.gameQuestion.update({ where: { id: gq.id }, data: { startedAt: now, endsAt, endedAt: null } }),
    prisma.game.update({
      where: { id: gameId },
      data: { status: "QUESTION", currentIndex: index, questionStartedAt: now, questionEndsAt: endsAt, pausedFromStatus: null, pausedAt: null },
    }),
  ]);
  void game;

  const q = await loadQuestionView(gameId, index);
  const views = await loadPlayerViews(gameId, gq.id);
  if (q) getBus().publish(gameId, { type: "question_started", question: q.view, currentIndex: index, players: views.players, serverTime: Date.now() });
  scheduleClose(gameId, gq.id, endsAt, settings.lateToleranceMs);
}

/** Close the current question (timer expiry, everyone answered, or host skip). Idempotent. */
export async function closeQuestion(gameId: string, gameQuestionId: string) {
  const { game } = await loadGame(gameId);
  if (game.status !== "QUESTION") return;
  const gq = await prisma.gameQuestion.findUnique({ where: { id: gameQuestionId } });
  if (!gq || gq.order !== game.currentIndex) return;
  clearTimer(gameId);

  // Players who did not answer lose their streak (no ledger row: they did not answer).
  const answered = await prisma.playerAnswer.findMany({ where: { gameQuestionId }, select: { gamePlayerId: true } });
  const answeredIds = new Set(answered.map((a) => a.gamePlayerId));
  const silent = await prisma.gamePlayer.findMany({ where: { gameId, streak: { gt: 0 } }, select: { id: true } });
  await prisma.$transaction([
    ...silent.filter((p) => !answeredIds.has(p.id)).map((p) => prisma.gamePlayer.update({ where: { id: p.id }, data: { streak: 0 } })),
    prisma.gameQuestion.update({ where: { id: gameQuestionId }, data: { endedAt: new Date() } }),
    prisma.game.update({ where: { id: gameId }, data: { status: "REVEAL" } }),
  ]);
  await recomputeTeamScores(gameId);

  const reveal = await loadRevealView(gameQuestionId);
  const views = await loadPlayerViews(gameId, gameQuestionId);
  if (reveal) getBus().publish(gameId, { type: "question_ended", reveal, players: views.players, teams: views.teams });
}

/** Host pressed "next": REVEAL → LEADERBOARD (if enabled) → next question / finish. */
export async function advance(gameId: string) {
  const { game, settings } = await loadGame(gameId);
  switch (game.status) {
    case "LOBBY":
      return startGame(gameId);
    case "QUESTION": {
      const gq = await prisma.gameQuestion.findUnique({ where: { gameId_order: { gameId, order: game.currentIndex } } });
      if (gq) await closeQuestion(gameId, gq.id);
      return;
    }
    case "REVEAL": {
      const total = await prisma.gameQuestion.count({ where: { gameId } });
      const isLast = game.currentIndex >= total - 1;
      if (settings.showLeaderboard && !isLast) {
        await prisma.game.update({ where: { id: gameId }, data: { status: "LEADERBOARD" } });
        const views = await loadPlayerViews(gameId);
        getBus().publish(gameId, { type: "leaderboard", ...views });
        return;
      }
      return isLast ? finishGame(gameId) : startQuestion(gameId, game.currentIndex + 1);
    }
    case "LEADERBOARD":
      return startQuestion(gameId, game.currentIndex + 1);
    case "PAUSED":
      throw new EngineError("Reprenez la partie avant de continuer.");
    default:
      throw new EngineError("La partie est terminée.");
  }
}

export async function pauseGame(gameId: string) {
  const { game } = await loadGame(gameId);
  if (!["QUESTION", "REVEAL", "LEADERBOARD"].includes(game.status)) throw new EngineError("Impossible de mettre en pause maintenant.");
  clearTimer(gameId);
  await prisma.game.update({ where: { id: gameId }, data: { status: "PAUSED", pausedFromStatus: game.status, pausedAt: new Date() } });
  getBus().publish(gameId, { type: "paused" });
}

export async function resumeGame(gameId: string) {
  const { game, settings } = await loadGame(gameId);
  if (game.status !== "PAUSED" || !game.pausedFromStatus) throw new EngineError("La partie n'est pas en pause.");
  const from = game.pausedFromStatus;
  let question = null;
  if (from === "QUESTION" && game.questionEndsAt && game.pausedAt) {
    // Shift the deadline by the pause duration so nobody loses time.
    const pausedFor = Date.now() - game.pausedAt.getTime();
    const endsAt = new Date(game.questionEndsAt.getTime() + pausedFor);
    const startedAt = game.questionStartedAt ? new Date(game.questionStartedAt.getTime() + pausedFor) : null;
    const gq = await prisma.gameQuestion.findUnique({ where: { gameId_order: { gameId, order: game.currentIndex } } });
    if (gq) {
      await prisma.$transaction([
        prisma.gameQuestion.update({ where: { id: gq.id }, data: { endsAt, startedAt: startedAt ?? undefined } }),
        prisma.game.update({ where: { id: gameId }, data: { status: from, pausedFromStatus: null, pausedAt: null, questionEndsAt: endsAt, questionStartedAt: startedAt } }),
      ]);
      scheduleClose(gameId, gq.id, endsAt, settings.lateToleranceMs);
      question = (await loadQuestionView(gameId, game.currentIndex))?.view ?? null;
    }
  } else {
    await prisma.game.update({ where: { id: gameId }, data: { status: from, pausedFromStatus: null, pausedAt: null } });
  }
  getBus().publish(gameId, { type: "resumed", question, serverTime: Date.now() });
  if (!question) {
    // Non-question statuses: resend the right event so clients restore the view.
    const views = await loadPlayerViews(gameId);
    if (from === "LEADERBOARD") getBus().publish(gameId, { type: "leaderboard", ...views });
    if (from === "REVEAL") {
      const gq = await prisma.gameQuestion.findUnique({ where: { gameId_order: { gameId, order: game.currentIndex } } });
      const reveal = gq ? await loadRevealView(gq.id) : null;
      if (reveal) getBus().publish(gameId, { type: "question_ended", reveal, players: views.players, teams: views.teams });
    }
  }
}

/** Finish the game: freeze results, award XP, publish. Idempotent. */
export async function finishGame(gameId: string) {
  const { game } = await loadGame(gameId);
  if (game.status === "FINISHED") return;
  clearTimer(gameId);
  const players = await prisma.gamePlayer.findMany({ where: { gameId }, include: { answers: true } });
  await recomputeTeamScores(gameId);
  const ranked = rankPlayers(players);

  await prisma.$transaction([
    prisma.game.update({ where: { id: gameId }, data: { status: "FINISHED", endedAt: new Date(), pausedFromStatus: null, pausedAt: null } }),
    ...ranked.map((p) => {
      const answeredCount = p.answers.length;
      const correctCount = p.answers.filter((a) => a.isCorrect).length;
      const avgResponseMs = answeredCount ? Math.round(p.answers.reduce((s, a) => s + a.responseMs, 0) / answeredCount) : 0;
      const xp = xpForScore(p.score);
      const level = levelFor(xp);
      return prisma.gameResult.upsert({
        where: { gamePlayerId: p.id },
        update: {},
        create: {
          gameId,
          gamePlayerId: p.id,
          rank: p.rank,
          score: p.score,
          correctCount,
          answeredCount,
          accuracy: answeredCount ? correctCount / answeredCount : 0,
          avgResponseMs,
          bestStreak: p.bestStreak,
          xpEarned: xp,
          level: level.level,
          levelName: level.name,
        },
      });
    }),
  ]);

  // XP for signed-in learners (ledger + profile total).
  for (const p of ranked) {
    const xp = xpForScore(p.score);
    if (xp <= 0) continue;
    await prisma.xPTransaction.create({ data: { userId: p.userId, gamePlayerId: p.id, amount: xp, reason: "GAME_SCORE" } });
    if (p.userId) await prisma.user.update({ where: { id: p.userId }, data: { totalXp: { increment: xp } } });
  }
  await track("quiz_completed", { userId: game.hostId, gameId, payload: { players: ranked.length } });
  getBus().publish(gameId, { type: "game_finished" });
}

/** Abort a game from the lobby or mid-way without producing results. */
export async function abandonGame(gameId: string) {
  const { game } = await loadGame(gameId);
  if (game.status === "FINISHED" || game.status === "ABANDONED") return;
  clearTimer(gameId);
  await prisma.game.update({ where: { id: gameId }, data: { status: "ABANDONED", endedAt: new Date() } });
  await track("game_abandoned", { userId: game.hostId, gameId });
  getBus().publish(gameId, { type: "game_finished" });
}

/** Safety net: close an expired question even if the in-memory timer was lost. */
export async function reconcileGame(gameId: string): Promise<void> {
  const game = await prisma.game.findUnique({ where: { id: gameId }, select: { status: true, questionEndsAt: true, currentIndex: true, settings: true } });
  if (!game || game.status !== "QUESTION" || !game.questionEndsAt) return;
  const tolerance = parseSettings(game.settings).lateToleranceMs;
  if (Date.now() > game.questionEndsAt.getTime() + tolerance) {
    const gq = await prisma.gameQuestion.findUnique({ where: { gameId_order: { gameId, order: game.currentIndex } }, select: { id: true } });
    if (gq) await closeQuestion(gameId, gq.id);
  }
}

// ---------------------------------------------------------------------------
// Answers
// ---------------------------------------------------------------------------

export type SubmitResult = {
  accepted: boolean;
  correct: boolean;
  correctAnswerId: string;
  basePoints: number;
  speedBonus: number;
  streakBonus: number;
  multiplier: number;
  penalty: number;
  total: number;
  streakAfter: number;
  score: number;
  responseMs: number;
  /** Second Chance: the first attempt was wrong and the player may answer once more. */
  retryAllowed?: boolean;
};

/**
 * Record a player's answer. The server measures the response time from the
 * question's start timestamp, validates the deadline (+ tolerance + Extra Time)
 * and writes the score ledger. A player can answer a question only once
 * (unique constraint), except via the Second Chance joker.
 */
export async function submitAnswer(opts: { gameId: string; playerId: string; gameQuestionId: string; answerId: string }): Promise<SubmitResult> {
  const { gameId, playerId, gameQuestionId, answerId } = opts;
  const { game, settings } = await loadGame(gameId);
  if (game.status !== "QUESTION") throw new EngineError("Cette question est terminée.", "CLOSED");
  const gq = await prisma.gameQuestion.findUnique({
    where: { id: gameQuestionId },
    include: { question: { include: { answers: true } } },
  });
  if (!gq || gq.gameId !== gameId || gq.order !== game.currentIndex || !gq.startedAt) throw new EngineError("Question inactive.", "CLOSED");
  const player = await prisma.gamePlayer.findUnique({ where: { id: playerId }, include: { jokers: true } });
  if (!player || player.gameId !== gameId) throw new EngineError("Joueur inconnu.", "FORBIDDEN");
  const answer = gq.question.answers.find((a) => a.id === answerId);
  if (!answer) throw new EngineError("Réponse invalide.", "INVALID");
  const correctAnswerId = gq.question.answers.find((a) => a.isCorrect)?.id ?? "";

  const now = Date.now();
  const responseMs = Math.max(0, now - gq.startedAt.getTime());
  const armed = (type: JokerType) => player.jokers.find((j) => j.type === type && j.usedOnId === gameQuestionId);
  const extraMs = armed("EXTRA_TIME") ? settings.extraTimeSeconds * 1000 : 0;
  const doublePoints = !!armed("DOUBLE_POINTS");
  const secondChance = !!armed("SECOND_CHANCE");
  const timeLimitMs = gq.question.timeLimit * 1000 + extraMs;

  const existing = await prisma.playerAnswer.findUnique({ where: { gamePlayerId_gameQuestionId: { gamePlayerId: playerId, gameQuestionId } } });
  if (existing) {
    const canRetry = secondChance && !existing.isCorrect && existing.attempts < 2;
    if (!canRetry) throw new EngineError("Vous avez déjà répondu à cette question.", "DUPLICATE");
  }

  const result = scoreAnswer({
    correct: answer.isCorrect,
    elapsedMs: responseMs,
    timeLimitMs,
    streakBefore: player.streak,
    points: gq.question.points,
    doublePoints,
    config: {
      maxSpeedBonus: settings.maxSpeedBonus,
      speedWeight: settings.speedWeight,
      streakEnabled: settings.streakEnabled,
      streakBonuses: settings.streakBonuses,
      wrongAnswerPenalty: settings.wrongAnswerPenalty,
      lateToleranceMs: settings.lateToleranceMs,
    },
  });

  // Second Chance: a wrong first attempt is recorded but not scored yet; the
  // player keeps their streak and may try once more.
  const firstAttemptPending = secondChance && !existing && !answer.isCorrect && result.accepted;

  const ledger = {
    answerId,
    isCorrect: answer.isCorrect,
    responseMs,
    basePoints: result.basePoints,
    speedBonus: result.speedBonus,
    streakBonus: result.streakBonus,
    multiplier: result.multiplier,
    penalty: firstAttemptPending ? 0 : result.penalty,
    pointsAwarded: firstAttemptPending ? 0 : result.total,
    streakAfter: firstAttemptPending ? player.streak : result.streakAfter,
    attempts: existing ? existing.attempts + 1 : 1,
  };

  const scoreDelta = ledger.pointsAwarded;
  const streakAfter = ledger.streakAfter;
  const ops = [
    existing
      ? prisma.playerAnswer.update({ where: { id: existing.id }, data: ledger })
      : prisma.playerAnswer.create({ data: { gamePlayerId: playerId, gameQuestionId, ...ledger } }),
    prisma.gamePlayer.update({
      where: { id: playerId },
      data: {
        score: { increment: scoreDelta },
        streak: streakAfter,
        bestStreak: Math.max(player.bestStreak, streakAfter),
        // Count each question once, on the first attempt.
        answeredCount: existing ? undefined : { increment: 1 },
        correctCount: answer.isCorrect ? { increment: 1 } : undefined,
        totalResponseMs: existing ? undefined : { increment: responseMs },
        lastSeenAt: new Date(),
      },
    }),
  ];
  try {
    await prisma.$transaction(ops);
  } catch (err) {
    const isUnique = typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "P2002";
    if (isUnique) throw new EngineError("Vous avez déjà répondu à cette question.", "DUPLICATE");
    throw err;
  }
  await track("question_answered", { gameId, payload: { correct: answer.isCorrect, responseMs, accepted: result.accepted } });

  const answeredCount = await prisma.playerAnswer.count({ where: { gameQuestionId } });
  getBus().publish(gameId, { type: "answer_count", answeredCount, playerId });

  // Close early once every connected player has answered (pending second chances excluded).
  const connected = await prisma.gamePlayer.count({ where: { gameId, connected: true } });
  if (!firstAttemptPending && answeredCount >= Math.max(connected, 1)) {
    const pendingRetries = await prisma.playerAnswer.count({
      where: { gameQuestionId, isCorrect: false, attempts: 1, player: { jokers: { some: { type: "SECOND_CHANCE", usedOnId: gameQuestionId } } } },
    });
    if (pendingRetries === 0) closeQuestion(gameId, gameQuestionId).catch((err) => console.error("[engine] early close failed", err));
  }

  return {
    accepted: result.accepted,
    correct: answer.isCorrect,
    correctAnswerId,
    basePoints: ledger.basePoints,
    speedBonus: ledger.speedBonus,
    streakBonus: ledger.streakBonus,
    multiplier: ledger.multiplier,
    penalty: ledger.penalty,
    total: ledger.pointsAwarded,
    streakAfter,
    score: player.score + scoreDelta,
    responseMs,
    retryAllowed: firstAttemptPending,
  };
}

export type { QuizSettings };
