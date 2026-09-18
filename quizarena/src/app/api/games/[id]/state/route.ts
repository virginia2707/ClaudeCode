import type { NextRequest } from "next/server";
import { buildPublicState } from "@/lib/game/state";
import { identifyViewer } from "@/lib/game/viewer";
import { reconcileGame } from "@/lib/game/engine";

export const dynamic = "force-dynamic";

/** Polling fallback / resync endpoint: full public state. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/games/[id]/state">) {
  const { id } = await ctx.params;
  const viewer = await identifyViewer(id);
  if (!viewer) return Response.json({ error: "Unauthorized" }, { status: 401 });
  await reconcileGame(id);
  const state = await buildPublicState(id);
  if (!state) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(state, { headers: { "Cache-Control": "no-store" } });
}
