import type { NextRequest } from "next/server";
import { getBus } from "@/lib/realtime/bus";
import type { GameEvent } from "@/lib/realtime/events";
import { buildPublicState } from "@/lib/game/state";
import { identifyViewer } from "@/lib/game/viewer";
import { setPlayerConnected } from "@/lib/game/join";
import { reconcileGame } from "@/lib/game/engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HEARTBEAT_MS = 15_000;

/**
 * Server-Sent Events stream for a game. Sends a full snapshot on connect, then
 * incremental events. Hosts and joined players only.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/games/[id]/events">) {
  const { id: gameId } = await ctx.params;
  const viewer = await identifyViewer(gameId);
  if (!viewer) return new Response("Unauthorized", { status: 401 });

  // Lazily close an expired question before sending the snapshot.
  await reconcileGame(gameId);
  const state = await buildPublicState(gameId);
  if (!state) return new Response("Not found", { status: 404 });

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: GameEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`));
        } catch {
          cleanup();
        }
      };
      const cleanup = () => {
        if (closed) return;
        closed = true;
        unsubscribe?.();
        if (heartbeat) clearInterval(heartbeat);
        if (viewer.role === "player") void setPlayerConnected(gameId, viewer.playerId, false);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      send({ type: "snapshot", state });
      unsubscribe = getBus().subscribe(gameId, send);
      heartbeat = setInterval(() => send({ type: "heartbeat", serverTime: Date.now() }), HEARTBEAT_MS);
      request.signal.addEventListener("abort", cleanup);
      if (viewer.role === "player") void setPlayerConnected(gameId, viewer.playerId, true);
    },
    cancel() {
      closed = true;
      unsubscribe?.();
      if (heartbeat) clearInterval(heartbeat);
      if (viewer.role === "player") void setPlayerConnected(gameId, viewer.playerId, false);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
