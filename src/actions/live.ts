"use server";

import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getLiveState, type LiveState } from "@/lib/sessions/live";
import { getAppUrl } from "@/lib/app-url";
import { enforceTimeout } from "@/actions/sessions";

/** État live rafraîchi par l'écran formateur (SSE + sondage de secours). */
export async function getLiveStateAction(sessionId: string): Promise<LiveState | null> {
  const user = await requireRole(["TRAINER", "ADMIN"]);
  const session = await prisma.gameSession.findFirst({
    where: user.role === "ADMIN" ? { id: sessionId } : { id: sessionId, hostId: user.id },
    select: { id: true },
  });
  if (!session) return null;
  await enforceTimeout(sessionId);
  return getLiveState(sessionId, await getAppUrl());
}
