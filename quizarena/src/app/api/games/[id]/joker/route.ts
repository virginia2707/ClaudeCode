import type { NextRequest } from "next/server";
import { z } from "zod";
import { getPlayerSession } from "@/lib/game/player-access";
import { useJoker as applyJoker, EngineError, reconcileGame } from "@/lib/game/engine";
import { rateLimit } from "@/lib/rate-limit";
import { JOKER_TYPES } from "@/lib/constants";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ gameQuestionId: z.string().min(1).max(64), type: z.enum(JOKER_TYPES) });

/** Player arms a joker on the current question. */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/games/[id]/joker">) {
  const { id: gameId } = await ctx.params;
  const player = await getPlayerSession(gameId);
  if (!player) return Response.json({ error: "Session joueur invalide." }, { status: 401 });
  const rl = rateLimit(`joker:${player.id}`, 20, 10_000);
  if (!rl.ok) return Response.json({ error: "Trop de requêtes." }, { status: 429 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Corps invalide." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Paramètres invalides." }, { status: 400 });
  await reconcileGame(gameId);
  try {
    const result = await applyJoker({ gameId, playerId: player.id, ...parsed.data });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof EngineError) {
      const status = err.code === "CLOSED" ? 410 : err.code === "FORBIDDEN" ? 403 : 400;
      return Response.json({ error: err.message, code: err.code }, { status });
    }
    console.error("[joker] unexpected", err);
    return Response.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
