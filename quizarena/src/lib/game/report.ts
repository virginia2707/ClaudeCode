import "server-only";
import { prisma } from "@/lib/db/prisma";
import { average, median } from "@/lib/utils";

export type QuestionStat = {
  questionId: string;
  gameQuestionId: string;
  order: number;
  text: string;
  category: string;
  difficulty: string;
  totalAnswers: number;
  correctAnswers: number;
  /** 0..1, null when nobody answered (avoids a misleading 0%). */
  successRate: number | null;
  avgResponseMs: number;
};

export type ScoreBucket = { label: string; min: number; max: number; count: number };

export type GameReport = {
  gameId: string;
  quizId: string;
  quizTitle: string;
  participants: number;
  avgScore: number;
  medianScore: number;
  bestStreak: number;
  avgAccuracy: number;
  avgResponseMs: number;
  questions: QuestionStat[];
  /** Most/least successful question with at least one answer; null if no data. */
  hardestQuestion: QuestionStat | null;
  easiestQuestion: QuestionStat | null;
  /** Questions below the review threshold — a signal to revisit, not a verdict. */
  reviewThreshold: number;
  questionsToReview: QuestionStat[];
  scoreDistribution: ScoreBucket[];
};

const REVIEW_THRESHOLD = 0.5;
const DISTRIBUTION_BUCKETS = 5;

/** Compute the full statistics report for one finished (or in-progress) game. */
export async function computeGameReport(gameId: string): Promise<GameReport | null> {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      quiz: { select: { id: true, title: true } },
      players: { select: { score: true, bestStreak: true, correctCount: true, answeredCount: true, totalResponseMs: true } },
      questions: {
        orderBy: { order: "asc" },
        include: {
          question: { select: { id: true, text: true, category: true, difficulty: true } },
          answers: { select: { isCorrect: true, responseMs: true } },
        },
      },
    },
  });
  if (!game) return null;

  const scores = game.players.map((p) => p.score);
  const accuracies = game.players.filter((p) => p.answeredCount > 0).map((p) => p.correctCount / p.answeredCount);
  const responseTimes = game.players.filter((p) => p.answeredCount > 0).map((p) => p.totalResponseMs / p.answeredCount);
  const bestStreak = game.players.reduce((m, p) => Math.max(m, p.bestStreak), 0);

  const questions: QuestionStat[] = game.questions.map((gq) => {
    const total = gq.answers.length;
    const correct = gq.answers.filter((a) => a.isCorrect).length;
    return {
      questionId: gq.question.id,
      gameQuestionId: gq.id,
      order: gq.order,
      text: gq.question.text,
      category: gq.question.category,
      difficulty: gq.question.difficulty,
      totalAnswers: total,
      correctAnswers: correct,
      successRate: total > 0 ? correct / total : null,
      avgResponseMs: total > 0 ? Math.round(average(gq.answers.map((a) => a.responseMs))) : 0,
    };
  });

  const withData = questions.filter((q) => q.successRate !== null);
  const hardestQuestion = withData.length ? withData.reduce((a, b) => (b.successRate! < a.successRate! ? b : a)) : null;
  const easiestQuestion = withData.length ? withData.reduce((a, b) => (b.successRate! > a.successRate! ? b : a)) : null;
  const questionsToReview = withData.filter((q) => q.successRate! < REVIEW_THRESHOLD).sort((a, b) => a.successRate! - b.successRate!);

  const maxScore = scores.length ? Math.max(...scores, 1) : 1;
  const bucketSize = Math.max(1, Math.ceil((maxScore + 1) / DISTRIBUTION_BUCKETS));
  const scoreDistribution: ScoreBucket[] = Array.from({ length: DISTRIBUTION_BUCKETS }, (_, i) => {
    const min = i * bucketSize;
    const max = i === DISTRIBUTION_BUCKETS - 1 ? Infinity : min + bucketSize - 1;
    return { label: max === Infinity ? `${min}+` : `${min}–${max}`, min, max, count: 0 };
  });
  for (const s of scores) {
    const bucket = scoreDistribution.find((b) => s >= b.min && s <= b.max) ?? scoreDistribution[scoreDistribution.length - 1];
    bucket.count += 1;
  }

  return {
    gameId: game.id,
    quizId: game.quiz.id,
    quizTitle: game.quiz.title,
    participants: game.players.length,
    avgScore: average(scores),
    medianScore: median(scores),
    bestStreak,
    avgAccuracy: average(accuracies),
    avgResponseMs: average(responseTimes),
    questions,
    hardestQuestion,
    easiestQuestion,
    reviewThreshold: REVIEW_THRESHOLD,
    questionsToReview,
    scoreDistribution,
  };
}

/** Persist the computed report as the game's QuizResult (idempotent, called once the game finishes). */
export async function persistGameReport(gameId: string): Promise<void> {
  const report = await computeGameReport(gameId);
  if (!report) return;
  await prisma.quizResult.upsert({
    where: { gameId },
    update: {
      participants: report.participants,
      avgScore: report.avgScore,
      medianScore: report.medianScore,
      stats: JSON.stringify(report),
    },
    create: {
      gameId,
      quizId: report.quizId,
      participants: report.participants,
      avgScore: report.avgScore,
      medianScore: report.medianScore,
      stats: JSON.stringify(report),
    },
  });
}
