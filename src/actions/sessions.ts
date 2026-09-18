"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";
import { getOwnedGame } from "@/lib/games/queries";
import { buildSnapshot, readSnapshot } from "@/lib/sessions/snapshot";
import { generateSessionCode } from "@/lib/engine/session-code";
import { computeTimerState, pauseDurationSeconds } from "@/lib/engine/timer";
import { hasBlockingIssues, validateForPublish } from "@/lib/games/publish";
import { publish } from "@/lib/realtime/hub";
import { track } from "@/lib/analytics/track";
import { PLAN_LIMITS } from "@/lib/plans";
import type { Plan } from "@/lib/constants";
import { failResult, okResult, type ActionResult } from "@/lib/action-result";

async function ownedSession(sessionId: string) {
  const user = await requireRole(["TRAINER", "ADMIN"]);
  const session = await prisma.gameSession.findFirst({
    where: user.role === "ADMIN" ? { id: sessionId } : { id: sessionId, hostId: user.id },
    include: { game: { select: { id: true, title: true } } },
  });
  return { user, session };
}

function revalidateSession(sessionId: string) {
  revalidatePath(`/app/sessions/${sessionId}`);
  revalidatePath("/app/sessions");
  revalidatePath("/app");
}

/** Crée une session à partir d'un jeu publié : snapshot figé + code d'accès. */
export async function launchSessionAction(gameId: string, formData?: FormData): Promise<ActionResult> {
  const user = await requireRole(["TRAINER", "ADMIN"]);
  const game = await getOwnedGame(gameId, user.id, { allowAdmin: true, role: user.role });
  if (!game) return failResult("Escape Game introuvable.");
  if (game.status !== "PUBLISHED") return failResult("Publiez d'abord cet Escape Game.");
  const issues = validateForPublish(game);
  if (hasBlockingIssues(issues)) return failResult("Ce jeu comporte des erreurs bloquantes. Corrigez-les avant de lancer une session.");

  const limits = PLAN_LIMITS[user.plan as Plan] ?? PLAN_LIMITS.FREE;
  if (limits.maxSessionsPerMonth !== null && user.role !== "ADMIN") {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const used = await prisma.gameSession.count({ where: { hostId: user.id, createdAt: { gte: monthStart } } });
    if (used >= limits.maxSessionsPerMonth) {
      return failResult(`Votre plan ${limits.label} autorise ${limits.maxSessionsPerMonth} sessions par mois.`);
    }
  }

  const snapshot = buildSnapshot(game);
  const modeOverride = formData?.get("mode");
  const mode = modeOverride === "TEAM" || modeOverride === "INDIVIDUAL" ? modeOverride : game.mode;
  const durationSeconds = snapshot.settings.timerMode === "NONE" ? null : (snapshot.settings.maxMinutes ?? game.estimatedMinutes) * 60;

  // Code unique parmi les sessions non terminées.
  let code = generateSessionCode();
  for (let i = 0; i < 10; i++) {
    const clash = await prisma.gameSession.findUnique({ where: { code }, select: { id: true } });
    if (!clash) break;
    code = generateSessionCode();
  }

  const session = await prisma.gameSession.create({
    data: {
      gameId: game.id,
      hostId: user.id,
      code,
      status: "LOBBY",
      mode,
      gameSnapshot: JSON.stringify(snapshot),
      durationSeconds,
    },
    select: { id: true },
  });
  await track({ name: "session_started", userId: user.id, gameId: game.id, sessionId: session.id, payload: { mode } });
  revalidateSession(session.id);
  redirect(`/app/sessions/${session.id}`);
}

export async function startSessionAction(sessionId: string): Promise<ActionResult> {
  const { session } = await ownedSession(sessionId);
  if (!session) return failResult("Session introuvable.");
  if (session.status === "ENDED") return failResult("Cette session est terminée.");
  if (session.status === "RUNNING") return okResult(undefined, "La mission est déjà lancée.");
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.gameSession.update({ where: { id: session.id }, data: { status: "RUNNING", startedAt: session.startedAt ?? now, pausedAt: null } });
    await tx.playerProgress.updateMany({ where: { sessionId: session.id, status: "NOT_STARTED" }, data: { status: "IN_PROGRESS", startedAt: now } });
  });
  publish(session.id, "session_started", { at: now.toISOString() });
  revalidateSession(session.id);
  return okResult(undefined, "Mission lancée.");
}

export async function pauseSessionAction(sessionId: string): Promise<ActionResult> {
  const { session } = await ownedSession(sessionId);
  if (!session) return failResult("Session introuvable.");
  const snapshot = readSnapshot(session.gameSnapshot);
  if (!snapshot.settings.pauseAllowed) return failResult("La pause est désactivée pour cet Escape Game.");
  if (session.status !== "RUNNING") return failResult("La mission n'est pas en cours.");
  await prisma.gameSession.update({ where: { id: session.id }, data: { status: "PAUSED", pausedAt: new Date() } });
  publish(session.id, "session_paused");
  revalidateSession(session.id);
  return okResult(undefined, "Mission en pause.");
}

export async function resumeSessionAction(sessionId: string): Promise<ActionResult> {
  const { session } = await ownedSession(sessionId);
  if (!session) return failResult("Session introuvable.");
  if (session.status !== "PAUSED" || !session.pausedAt) return failResult("La mission n'est pas en pause.");
  const added = pauseDurationSeconds(session.pausedAt);
  await prisma.gameSession.update({
    where: { id: session.id },
    data: { status: "RUNNING", pausedAt: null, pausedTotalSeconds: session.pausedTotalSeconds + added },
  });
  publish(session.id, "session_resumed");
  revalidateSession(session.id);
  return okResult(undefined, "Mission reprise.");
}

export async function extendSessionAction(sessionId: string, minutes: number): Promise<ActionResult> {
  const { session } = await ownedSession(sessionId);
  if (!session) return failResult("Session introuvable.");
  if (session.status === "ENDED") return failResult("Cette session est terminée.");
  const safeMinutes = Math.max(1, Math.min(120, Math.round(minutes)));
  await prisma.gameSession.update({ where: { id: session.id }, data: { extendedSeconds: session.extendedSeconds + safeMinutes * 60 } });
  publish(session.id, "time_extended", { minutes: safeMinutes });
  revalidateSession(session.id);
  return okResult(undefined, `${safeMinutes} minutes ajoutées.`);
}

export async function endSessionAction(sessionId: string, reason: "TRAINER" | "TIMEOUT" = "TRAINER"): Promise<ActionResult> {
  const { session } = await ownedSession(sessionId);
  if (!session) return failResult("Session introuvable.");
  if (session.status === "ENDED") return okResult(undefined, "Session déjà terminée.");
  await finalizeSession(session.id, reason);
  revalidateSession(session.id);
  return okResult(undefined, "Session terminée.");
}

/** Clôture technique : marque la session et fige les progressions en cours. */
export async function finalizeSession(sessionId: string, reason: "TRAINER" | "TIMEOUT" | "ALL_COMPLETED") {
  const now = new Date();
  const session = await prisma.gameSession.findUnique({ where: { id: sessionId }, select: { id: true, status: true, startedAt: true, pausedTotalSeconds: true } });
  if (!session || session.status === "ENDED") return;
  await prisma.$transaction(async (tx) => {
    await tx.gameSession.update({ where: { id: sessionId }, data: { status: "ENDED", endedAt: now, endReason: reason, pausedAt: null } });
    const progresses = await tx.playerProgress.findMany({ where: { sessionId, status: "IN_PROGRESS" }, select: { id: true, startedAt: true } });
    for (const p of progresses) {
      const spent = p.startedAt ? Math.max(0, Math.floor((now.getTime() - p.startedAt.getTime()) / 1000) - session.pausedTotalSeconds) : 0;
      await tx.playerProgress.update({
        where: { id: p.id },
        data: { status: reason === "TIMEOUT" ? "TIMED_OUT" : "ABANDONED", completedAt: now, timeSpentSeconds: spent },
      });
    }
  });
  publish(sessionId, "session_ended", { reason });
}

/** Le formateur débloque manuellement une étape pour un acteur. */
export async function trainerUnlockStepAction(sessionId: string, progressId: string, stepId: string): Promise<ActionResult> {
  const { session } = await ownedSession(sessionId);
  if (!session) return failResult("Session introuvable.");
  const progress = await prisma.playerProgress.findFirst({ where: { id: progressId, sessionId }, select: { id: true, trainerUnlocks: true } });
  if (!progress) return failResult("Participant introuvable.");
  const unlocks = new Set<string>(JSON.parse(progress.trainerUnlocks || "[]"));
  unlocks.add(stepId);
  await prisma.playerProgress.update({ where: { id: progress.id }, data: { trainerUnlocks: JSON.stringify([...unlocks]) } });
  publish(sessionId, "step_unlocked", { progressId, stepId });
  revalidateSession(sessionId);
  return okResult(undefined, "Étape débloquée.");
}

/** Le formateur offre le prochain indice, sans coût pour l'apprenant. */
export async function trainerGrantHintAction(sessionId: string, progressId: string): Promise<ActionResult> {
  const { session } = await ownedSession(sessionId);
  if (!session) return failResult("Session introuvable.");
  const progress = await prisma.playerProgress.findFirst({ where: { id: progressId, sessionId }, include: { hintRequests: true } });
  if (!progress || !progress.currentStepId) return failResult("Ce participant n'est sur aucune étape.");
  const snapshot = readSnapshot(session.gameSnapshot);
  const step = snapshot.steps.find((s) => s.id === progress.currentStepId);
  const hints = step?.puzzle?.hints ?? [];
  const used = new Set(progress.hintRequests.map((h) => h.hintId));
  const next = hints.find((h) => !used.has(h.id));
  if (!next) return failResult("Aucun indice supplémentaire sur cette étape.");
  await prisma.$transaction(async (tx) => {
    await tx.hintRequest.create({ data: { progressId: progress.id, hintId: next.id, grantedBy: "TRAINER", pointCost: 0 } });
    await tx.playerProgress.update({ where: { id: progress.id }, data: { hintsUsed: { increment: 1 } } });
  });
  publish(sessionId, "hint_granted", { progressId, hintId: next.id });
  revalidateSession(sessionId);
  return okResult(undefined, "Indice envoyé (sans pénalité).");
}

/** Validation manuelle d'une réponse en attente. */
export async function reviewAnswerAction(sessionId: string, answerId: string, approve: boolean): Promise<ActionResult> {
  const { session } = await ownedSession(sessionId);
  if (!session) return failResult("Session introuvable.");
  const answer = await prisma.playerAnswer.findFirst({ where: { id: answerId, progress: { sessionId } }, include: { progress: true } });
  if (!answer || answer.status !== "PENDING") return failResult("Réponse introuvable ou déjà traitée.");
  const { applyManualDecision } = await import("@/lib/sessions/engine-runner");
  await applyManualDecision(answer.id, approve);
  publish(sessionId, "progress_updated", { progressId: answer.progressId });
  revalidateSession(sessionId);
  return okResult(undefined, approve ? "Réponse validée." : "Réponse refusée.");
}

/** Vérifie l'expiration du chronomètre et clôture la session le cas échéant. */
export async function enforceTimeout(sessionId: string) {
  const session = await prisma.gameSession.findUnique({ where: { id: sessionId } });
  if (!session || session.status === "ENDED") return false;
  const snapshot = readSnapshot(session.gameSnapshot);
  if (snapshot.settings.timerMode === "NONE" || session.durationSeconds === null) return false;
  const timer = computeTimerState({
    timerMode: snapshot.settings.timerMode as "NONE" | "GLOBAL" | "PER_STEP",
    durationSeconds: session.durationSeconds,
    startedAt: session.startedAt,
    pausedAt: session.pausedAt,
    pausedTotalSeconds: session.pausedTotalSeconds,
    extendedSeconds: session.extendedSeconds,
    endedAt: session.endedAt,
  });
  if (timer.expired && snapshot.settings.endOnTimeout) {
    await finalizeSession(sessionId, "TIMEOUT");
    return true;
  }
  return timer.expired;
}
