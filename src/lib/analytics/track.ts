import "server-only";
import { prisma } from "@/lib/prisma";
import type { AnalyticsEventName } from "@/lib/constants";

type TrackInput = {
  name: AnalyticsEventName;
  userId?: string | null;
  gameId?: string | null;
  sessionId?: string | null;
  actorId?: string | null;
  payload?: Record<string, unknown>;
};

/** Enregistre un événement produit. Ne doit jamais faire échouer l'action appelante. */
export async function track(input: TrackInput) {
  try {
    await prisma.analyticsEvent.create({
      data: {
        name: input.name,
        userId: input.userId ?? null,
        gameId: input.gameId ?? null,
        sessionId: input.sessionId ?? null,
        actorId: input.actorId ?? null,
        payload: JSON.stringify(input.payload ?? {}),
      },
    });
  } catch (error) {
    console.error("analytics.track failed", error);
  }
}
