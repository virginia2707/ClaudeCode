"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getPlayerToken, setPlayerCookie } from "@/lib/auth/player";
import { getClientIp } from "@/lib/request";
import { rateLimit } from "@/lib/auth/rate-limit";
import { normalizeSessionCode } from "@/lib/engine/session-code";
import { readSnapshot } from "@/lib/sessions/snapshot";
import { enterCode, getLearnerState, requestHint, submitAnswer, type LearnerState } from "@/lib/sessions/engine-runner";
import { enforceTimeout } from "@/actions/sessions";
import { publish } from "@/lib/realtime/hub";
import { track } from "@/lib/analytics/track";
import { failResult, type ActionResult } from "@/lib/action-result";

export type JoinState = ActionResult & { values?: Record<string, string> };

const joinSchema = z.object({
  firstName: z.string().trim().min(1, "Prénom requis").max(40, "Prénom trop long"),
  displayName: z.string().trim().min(1, "Nom ou pseudonyme requis").max(40, "Nom trop long"),
  teamName: z.string().trim().max(40).optional().default(""),
});

/** Rejoint une session : crée le participant, sa progression et son cookie signé. */
export async function joinSessionAction(code: string, _prev: JoinState, formData: FormData): Promise<JoinState> {
  const ip = await getClientIp();
  const limit = rateLimit(`joinpost:${ip}`, 20, 10 * 60 * 1000);
  if (!limit.ok) return failResult("Trop de tentatives. Patientez quelques minutes.");

  const values = {
    firstName: String(formData.get("firstName") ?? ""),
    displayName: String(formData.get("displayName") ?? ""),
    teamName: String(formData.get("teamName") ?? ""),
  };
  const parsed = joinSchema.safeParse(values);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ...failResult("Vérifiez le formulaire.", { [String(issue.path[0])]: issue.message }), values };
  }

  const session = await prisma.gameSession.findUnique({
    where: { code: normalizeSessionCode(code) },
    include: { game: { select: { maxParticipants: true } }, _count: { select: { players: true } } },
  });
  if (!session) return { ...failResult("Session introuvable."), values };
  if (session.status === "ENDED") return { ...failResult("Cette session est terminée."), values };
  if (session._count.players >= session.game.maxParticipants) return { ...failResult("Cette session est complète."), values };

  const existing = await prisma.sessionPlayer.findUnique({
    where: { sessionId_displayName: { sessionId: session.id, displayName: parsed.data.displayName } },
    select: { id: true },
  });
  if (existing) {
    return { ...failResult("Ce nom est déjà utilisé dans cette session.", { displayName: "Nom déjà pris, choisissez-en un autre" }), values };
  }

  const snapshot = readSnapshot(session.gameSnapshot);
  const isTeamMode = session.mode === "TEAM";
  const teamName = parsed.data.teamName.trim();
  if (isTeamMode && !teamName) {
    return { ...failResult("Indiquez le nom de votre équipe.", { teamName: "Nom d'équipe requis" }), values };
  }

  const player = await prisma.$transaction(async (tx) => {
    const created = await tx.sessionPlayer.create({
      data: { sessionId: session.id, firstName: parsed.data.firstName, displayName: parsed.data.displayName },
      select: { id: true },
    });

    if (isTeamMode) {
      const team =
        (await tx.team.findUnique({ where: { sessionId_name: { sessionId: session.id, name: teamName } }, select: { id: true } })) ??
        (await tx.team.create({ data: { sessionId: session.id, name: teamName }, select: { id: true } }));
      const memberCount = await tx.teamMember.count({ where: { teamId: team.id } });
      await tx.teamMember.create({ data: { teamId: team.id, playerId: created.id, role: memberCount === 0 ? "CAPTAIN" : "MEMBER" } });
      // Une seule progression par équipe, partagée par ses membres.
      const teamProgress = await tx.playerProgress.findUnique({ where: { teamId: team.id }, select: { id: true } });
      if (!teamProgress) {
        await tx.playerProgress.create({
          data: {
            sessionId: session.id,
            actorType: "TEAM",
            teamId: team.id,
            status: session.status === "RUNNING" ? "IN_PROGRESS" : "NOT_STARTED",
            startedAt: session.status === "RUNNING" ? new Date() : null,
            currentStepId: snapshot.steps[0]?.id ?? null,
          },
        });
      }
    } else {
      await tx.playerProgress.create({
        data: {
          sessionId: session.id,
          actorType: "PLAYER",
          playerId: created.id,
          status: session.status === "RUNNING" ? "IN_PROGRESS" : "NOT_STARTED",
          startedAt: session.status === "RUNNING" ? new Date() : null,
          currentStepId: snapshot.steps[0]?.id ?? null,
        },
      });
    }
    return created;
  });

  await setPlayerCookie(session.id, player.id);
  await track({ name: "player_joined", sessionId: session.id, gameId: snapshot.gameId, actorId: player.id });
  publish(session.id, "player_joined", { playerId: player.id, displayName: parsed.data.displayName });
  redirect(`/play/${session.code}`);
}

/** Retrouve la progression associée au navigateur courant. */
export async function resolveProgress(sessionId: string) {
  const token = await getPlayerToken(sessionId);
  if (!token) return null;
  const player = await prisma.sessionPlayer.findFirst({
    where: { id: token.pid, sessionId },
    include: { progress: { select: { id: true } }, teamMembership: { include: { team: { include: { progress: { select: { id: true } } } } } } },
  });
  if (!player) return null;
  const progressId = player.progress?.id ?? player.teamMembership?.team.progress?.id ?? null;
  if (!progressId) return null;
  return { playerId: player.id, progressId, displayName: player.displayName };
}

export async function getPlayStateAction(sessionId: string): Promise<LearnerState | null> {
  await enforceTimeout(sessionId);
  const resolved = await resolveProgress(sessionId);
  if (!resolved) return null;
  await prisma.sessionPlayer.update({ where: { id: resolved.playerId }, data: { lastSeenAt: new Date(), connection: "ONLINE" } }).catch(() => undefined);
  return getLearnerState(sessionId, resolved.progressId);
}

export async function submitAnswerAction(sessionId: string, stepId: string, submission: unknown) {
  const resolved = await resolveProgress(sessionId);
  if (!resolved) return { ok: false as const, error: "Session expirée. Rejoignez de nouveau la mission." };
  await enforceTimeout(sessionId);
  return submitAnswer(sessionId, resolved.progressId, stepId, submission);
}

export async function requestHintAction(sessionId: string, hintId: string) {
  const resolved = await resolveProgress(sessionId);
  if (!resolved) return { ok: false as const, error: "Session expirée." };
  return requestHint(sessionId, resolved.progressId, hintId);
}

export async function enterCodeAction(sessionId: string, code: string) {
  const resolved = await resolveProgress(sessionId);
  if (!resolved) return { ok: false as const, error: "Session expirée." };
  return enterCode(sessionId, resolved.progressId, code);
}

/** Marque la mission comme abandonnée (quitter volontairement). */
export async function abandonAction(sessionId: string) {
  const resolved = await resolveProgress(sessionId);
  if (!resolved) return { ok: false as const, error: "Session expirée." };
  const progress = await prisma.playerProgress.findUnique({ where: { id: resolved.progressId }, select: { id: true, status: true, sessionId: true, session: { select: { gameSnapshot: true } } } });
  if (!progress || progress.status === "COMPLETED") return { ok: true as const };
  await prisma.playerProgress.update({ where: { id: progress.id }, data: { status: "ABANDONED", completedAt: new Date() } });
  const snapshot = readSnapshot(progress.session.gameSnapshot);
  await track({ name: "game_abandoned", sessionId, gameId: snapshot.gameId, actorId: progress.id });
  publish(sessionId, "progress_updated", { progressId: progress.id });
  return { ok: true as const };
}
