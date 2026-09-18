import "server-only";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { parseSettings, type QuizSettings } from "@/lib/validation/quiz";
import { generateCode } from "./code";
import { track } from "@/lib/analytics";

const TEAM_COLORS = ["#7c6cff", "#ffb547", "#3ed598", "#4fc3f7", "#ff6b6b", "#c084fc", "#f472b6", "#facc15", "#34d399", "#60a5fa", "#fb923c", "#a3e635"];

export class GameCreationError extends Error {}

/**
 * Create a live game from a published quiz: snapshot settings, instantiate
 * GameQuestion rows, create teams (team mode) and allocate a unique join code.
 */
export async function createGame(opts: { quizId: string; hostId: string | null; isDemo?: boolean; overrides?: Partial<QuizSettings> }) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: opts.quizId },
    include: { questions: { orderBy: { order: "asc" }, select: { id: true } } },
  });
  if (!quiz) throw new GameCreationError("Quiz introuvable.");
  if (quiz.status !== "PUBLISHED") throw new GameCreationError("Le quiz doit être publié avant de lancer une partie.");
  if (quiz.questions.length === 0) throw new GameCreationError("Le quiz ne contient aucune question.");

  const settings: QuizSettings = { ...parseSettings(quiz.settings), ...(opts.overrides ?? {}) };
  const hostToken = opts.hostId ? null : randomBytes(24).toString("base64url");

  // Retry on the (unlikely) code collision.
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateCode();
    try {
      const game = await prisma.game.create({
        data: {
          quizId: quiz.id,
          hostId: opts.hostId,
          hostToken,
          code,
          mode: settings.mode,
          settings: JSON.stringify(settings),
          isDemo: opts.isDemo ?? quiz.isDemo,
          questions: { create: quiz.questions.map((q, i) => ({ questionId: q.id, order: i })) },
          teams:
            settings.mode === "TEAM"
              ? { create: settings.teamNames.map((name, i) => ({ name, color: TEAM_COLORS[i % TEAM_COLORS.length] })) }
              : undefined,
        },
      });
      await track("game_created", { userId: opts.hostId, gameId: game.id, payload: { quizId: quiz.id, mode: game.mode, demo: game.isDemo } });
      return game;
    } catch (err) {
      const isUnique = typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "P2002";
      if (!isUnique) throw err;
    }
  }
  throw new GameCreationError("Impossible de générer un code de partie unique. Réessayez.");
}

export function joinUrl(code: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";
  return `${base}/join?code=${code}`;
}
