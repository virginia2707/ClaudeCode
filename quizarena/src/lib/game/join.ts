import "server-only";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { normalizeCode, isValidCodeFormat } from "./code";
import { parseSettings } from "@/lib/validation/quiz";
import { JOKER_TYPES, PLAN_LIMITS, type Plan } from "@/lib/constants";
import { getBus } from "@/lib/realtime/bus";
import { loadPlayerViews } from "./state";
import { track } from "@/lib/analytics";

export class JoinError extends Error {
  constructor(message: string, public field: "code" | "nickname" | "teamId" | "_" = "_") {
    super(message);
  }
}

export async function findJoinableGame(rawCode: string) {
  const code = normalizeCode(rawCode);
  if (!isValidCodeFormat(code)) throw new JoinError("Code invalide : 6 caractères attendus.", "code");
  const game = await prisma.game.findUnique({
    where: { code },
    include: { quiz: { select: { title: true, description: true } }, teams: { orderBy: { name: "asc" } }, host: { select: { plan: true } } },
  });
  if (!game) throw new JoinError("Aucune partie ne correspond à ce code.", "code");
  if (game.status === "FINISHED" || game.status === "ABANDONED") throw new JoinError("Cette partie est terminée.", "code");
  return game;
}

/**
 * Register a player in a game. Nicknames are unique per game (case-insensitive).
 * Late joining (after the game started) is allowed only while in LOBBY for the MVP.
 */
export async function joinGame(opts: { code: string; nickname: string; teamId?: string | null; userId?: string | null }) {
  const game = await findJoinableGame(opts.code);
  if (game.status !== "LOBBY") throw new JoinError("La partie a déjà commencé. Demandez au formateur d'ouvrir une nouvelle partie.", "code");

  const nickname = opts.nickname.trim().replace(/\s+/g, " ");
  if (nickname.length < 2 || nickname.length > 24) throw new JoinError("Pseudo : entre 2 et 24 caractères.", "nickname");

  const settings = parseSettings(game.settings);
  let teamId: string | null = null;
  if (game.mode === "TEAM") {
    const team = game.teams.find((t) => t.id === opts.teamId);
    if (!team) throw new JoinError("Choisissez une équipe.", "teamId");
    teamId = team.id;
  }

  const plan = (game.host?.plan ?? "PRO") as Plan; // demo games (no host) behave like PRO
  const maxPlayers = PLAN_LIMITS[plan]?.maxPlayersPerGame ?? PLAN_LIMITS.FREE.maxPlayersPerGame;
  const count = await prisma.gamePlayer.count({ where: { gameId: game.id } });
  if (count >= maxPlayers) throw new JoinError("La partie est complète.", "_");

  // SQLite has no case-insensitive `equals`: compare normalised nicknames in memory.
  const nicknames = await prisma.gamePlayer.findMany({ where: { gameId: game.id }, select: { nickname: true } });
  const wanted = nickname.toLocaleLowerCase("fr-FR");
  if (nicknames.some((n) => n.nickname.toLocaleLowerCase("fr-FR") === wanted)) {
    throw new JoinError("Ce pseudo est déjà utilisé dans cette partie.", "nickname");
  }

  const sessionToken = randomBytes(24).toString("base64url");
  const player = await prisma.gamePlayer.create({
    data: {
      gameId: game.id,
      nickname,
      teamId,
      userId: opts.userId ?? null,
      sessionToken,
      jokers: settings.jokersEnabled
        ? { create: JOKER_TYPES.filter((t) => settings.jokers[t] > 0).map((t) => ({ type: t, remaining: settings.jokers[t] })) }
        : undefined,
    },
  });
  await track("player_joined", { userId: opts.userId, gameId: game.id, payload: { team: teamId ? 1 : 0 } });
  const views = await loadPlayerViews(game.id);
  getBus().publish(game.id, { type: "players", ...views });
  return { game, player };
}

/** Mark connection status and broadcast the player list. */
export async function setPlayerConnected(gameId: string, playerId: string, connected: boolean) {
  try {
    await prisma.gamePlayer.update({ where: { id: playerId }, data: { connected, lastSeenAt: new Date() } });
    const game = await prisma.game.findUnique({ where: { id: gameId }, select: { currentIndex: true, status: true } });
    const gq = game && game.currentIndex >= 0 ? await prisma.gameQuestion.findUnique({ where: { gameId_order: { gameId, order: game.currentIndex } }, select: { id: true } }) : null;
    const views = await loadPlayerViews(gameId, gq?.id);
    getBus().publish(gameId, { type: "players", ...views });
  } catch (err) {
    console.error("[realtime] setPlayerConnected failed", err);
  }
}
