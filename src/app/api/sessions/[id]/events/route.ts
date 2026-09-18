import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { getPlayerToken } from "@/lib/auth/player";
import { subscribe, type SessionEvent } from "@/lib/realtime/hub";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Flux SSE des événements d'une session. Accessible au formateur hôte et aux
 * participants munis d'un jeton valide. Un battement toutes les 15 s maintient
 * la connexion ouverte derrière les proxys.
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/sessions/[id]/events">) {
  const { id } = await ctx.params;
  const session = await prisma.gameSession.findUnique({ where: { id }, select: { id: true, hostId: true } });
  if (!session) return new Response("Not found", { status: 404 });

  const user = await getCurrentUser();
  const isHost = user && (user.id === session.hostId || user.role === "ADMIN");
  const playerToken = await getPlayerToken(session.id);
  if (!isHost && !playerToken) return new Response("Forbidden", { status: 403 });

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: SessionEvent) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event.name}\ndata: ${JSON.stringify(event)}\n\n`));
        } catch {
          cleanup();
        }
      };
      const cleanup = () => {
        unsubscribe?.();
        unsubscribe = null;
        if (heartbeat) clearInterval(heartbeat);
        heartbeat = null;
      };
      controller.enqueue(encoder.encode(`retry: 3000\nevent: ready\ndata: {"at":${Date.now()}}\n\n`));
      unsubscribe = subscribe(session.id, send);
      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          cleanup();
        }
      }, 15000);
    },
    cancel() {
      unsubscribe?.();
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Désactive la bufferisation côté proxy (nginx et assimilés).
      "X-Accel-Buffering": "no",
    },
  });
}
