import "server-only";
import { prisma } from "@/lib/db/prisma";
import { parseSettings } from "@/lib/validation/quiz";
import type { GameStatePublic, PlayerView, QuestionView, ResultView, RevealView, TeamView } from "@/lib/realtime/events";

/** Rank players by score (ties keep join order) and teams by score. */
export function rankPlayers<T extends { score: number; joinedAt?: Date }>(players: T[]): (T & { rank: number })[] {
  return [...players]
    .sort((a, b) => b.score - a.score || ((a.joinedAt?.getTime() ?? 0) - (b.joinedAt?.getTime() ?? 0)))
    .map((p, i) => ({ ...p, rank: i + 1 }));
}

export async function loadPlayerViews(gameId: string, currentGameQuestionId?: string | null): Promise<{ players: PlayerView[]; teams: TeamView[] }> {
  const [players, teams, answered] = await Promise.all([
    prisma.gamePlayer.findMany({ where: { gameId }, include: { team: { select: { name: true } } }, orderBy: { joinedAt: "asc" } }),
    prisma.team.findMany({ where: { gameId }, orderBy: { name: "asc" } }),
    currentGameQuestionId
      ? prisma.playerAnswer.findMany({ where: { gameQuestionId: currentGameQuestionId }, select: { gamePlayerId: true } })
      : Promise.resolve([] as { gamePlayerId: string }[]),
  ]);
  const answeredSet = new Set(answered.map((a) => a.gamePlayerId));
  const ranked = rankPlayers(players);
  const playerViews: PlayerView[] = ranked.map((p) => ({
    id: p.id,
    nickname: p.nickname,
    teamId: p.teamId,
    teamName: p.team?.name ?? null,
    score: p.score,
    streak: p.streak,
    connected: p.connected,
    answered: answeredSet.has(p.id),
    rank: p.rank,
    previousRank: p.previousRank,
  }));
  const teamViews: TeamView[] = [...teams]
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .map((t, i) => ({ id: t.id, name: t.name, color: t.color, score: t.score, rank: i + 1 }));
  return { players: playerViews, teams: teamViews };
}

export async function loadQuestionView(gameId: string, index: number): Promise<{ view: QuestionView; correctAnswerId: string; explanation: string; gameQuestionId: string } | null> {
  const gq = await prisma.gameQuestion.findUnique({
    where: { gameId_order: { gameId, order: index } },
    include: { question: { include: { answers: { orderBy: { order: "asc" } } } }, game: { select: { settings: true } } },
  });
  if (!gq) return null;
  const total = await prisma.gameQuestion.count({ where: { gameId } });
  const correct = gq.question.answers.find((a) => a.isCorrect);
  const view: QuestionView = {
    gameQuestionId: gq.id,
    index,
    total,
    text: gq.question.text,
    imageUrl: gq.question.imageUrl,
    imageAlt: gq.question.imageAlt,
    answers: gq.question.answers.map((a) => ({ id: a.id, text: a.text })),
    timeLimit: gq.question.timeLimit,
    points: gq.question.points,
    startedAt: gq.startedAt?.getTime() ?? 0,
    endsAt: gq.endsAt?.getTime() ?? 0,
  };
  return { view, correctAnswerId: correct?.id ?? "", explanation: gq.question.explanation, gameQuestionId: gq.id };
}

export async function loadRevealView(gameQuestionId: string): Promise<RevealView | null> {
  const gq = await prisma.gameQuestion.findUnique({
    where: { id: gameQuestionId },
    include: { question: { include: { answers: true } }, answers: { select: { answerId: true } } },
  });
  if (!gq) return null;
  const distribution: Record<string, number> = {};
  for (const a of gq.question.answers) distribution[a.id] = 0;
  for (const pa of gq.answers) if (pa.answerId) distribution[pa.answerId] = (distribution[pa.answerId] ?? 0) + 1;
  return {
    gameQuestionId: gq.id,
    correctAnswerId: gq.question.answers.find((a) => a.isCorrect)?.id ?? "",
    explanation: gq.question.explanation,
    distribution,
    answeredCount: gq.answers.length,
  };
}

export async function loadResults(gameId: string): Promise<ResultView[]> {
  const rows = await prisma.gameResult.findMany({
    where: { gameId },
    orderBy: { rank: "asc" },
    include: { player: { include: { team: { select: { name: true } }, badges: { include: { badge: true } } } } },
  });
  return rows.map((r) => ({
    playerId: r.gamePlayerId,
    nickname: r.player.nickname,
    teamName: r.player.team?.name ?? null,
    rank: r.rank,
    score: r.score,
    correctCount: r.correctCount,
    answeredCount: r.answeredCount,
    accuracy: r.accuracy,
    avgResponseMs: r.avgResponseMs,
    bestStreak: r.bestStreak,
    xpEarned: r.xpEarned,
    level: r.level,
    levelName: r.levelName,
    badges: r.player.badges.map((b) => ({ code: b.badge.code, name: b.badge.name, icon: b.badge.icon })),
  }));
}

/** Full public state of a game (what every viewer may see). */
export async function buildPublicState(gameId: string): Promise<GameStatePublic | null> {
  const game = await prisma.game.findUnique({ where: { id: gameId }, include: { quiz: { select: { title: true, description: true } } } });
  if (!game) return null;
  const settings = parseSettings(game.settings);
  const total = await prisma.gameQuestion.count({ where: { gameId } });

  let question: QuestionView | null = null;
  let reveal: RevealView | null = null;
  let currentGqId: string | null = null;
  const showsQuestion = ["QUESTION", "REVEAL", "LEADERBOARD", "PAUSED"].includes(game.status);
  if (showsQuestion && game.currentIndex >= 0) {
    const q = await loadQuestionView(gameId, game.currentIndex);
    if (q) {
      question = q.view;
      currentGqId = q.gameQuestionId;
      if (game.status === "REVEAL" || game.status === "LEADERBOARD") reveal = await loadRevealView(q.gameQuestionId);
    }
  }
  const { players, teams } = await loadPlayerViews(gameId, currentGqId);
  const results = game.status === "FINISHED" ? await loadResults(gameId) : null;
  return {
    gameId: game.id,
    code: game.code,
    status: game.status,
    mode: game.mode as "INDIVIDUAL" | "TEAM",
    title: game.quiz.title,
    description: game.quiz.description,
    totalQuestions: total,
    currentIndex: game.currentIndex,
    question,
    reveal,
    players,
    teams,
    answeredCount: players.filter((p) => p.answered).length,
    results,
    settings: {
      feedbackEnabled: settings.feedbackEnabled,
      showExplanation: settings.showExplanation,
      showLeaderboard: settings.showLeaderboard,
      showAnswerDistribution: settings.showAnswerDistribution,
      jokersEnabled: settings.jokersEnabled,
    },
    serverTime: Date.now(),
  };
}
