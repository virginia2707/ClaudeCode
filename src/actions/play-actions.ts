"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { applyConsequence } from "@/lib/scoring";
import { checkBadgesAfterDecision, checkBadgesAfterMissionComplete, checkBadgesAfterSimulationComplete } from "@/lib/badges";
import { generateReport } from "@/lib/report";

export type JoinState = { error?: string } | undefined;

export async function joinSimulationAction(_prev: JoinState, formData: FormData): Promise<JoinState> {
  const user = await requireRole(["APPRENANT", "ADMIN", "FORMATEUR"]);
  const code = String(formData.get("accessCode") ?? "").trim().toUpperCase();
  if (!code) return { error: "Merci de saisir un code d'accès." };

  const simulation = await prisma.simulation.findUnique({
    where: { accessCode: code },
    include: { missions: { orderBy: { order: "asc" }, include: { situations: { orderBy: { order: "asc" } } } } },
  });

  if (!simulation || simulation.status !== "PUBLISHED") {
    return { error: "Code d'accès invalide ou simulation non publiée." };
  }

  const existing = await prisma.progress.findUnique({
    where: { userId_simulationId: { userId: user.id, simulationId: simulation.id } },
  });
  if (existing) {
    redirect(`/play/${existing.id}`);
  }

  const firstMission = simulation.missions[0];
  const firstSituation = firstMission?.situations[0];
  if (!firstMission || !firstSituation) {
    return { error: "Cette simulation ne contient pas encore de contenu jouable." };
  }

  const progress = await prisma.progress.create({
    data: {
      userId: user.id,
      simulationId: simulation.id,
      currentMissionId: firstMission.id,
      currentSituationId: firstSituation.id,
    },
  });

  redirect(`/play/${progress.id}`);
}

async function loadOrderedMissions(simulationId: string) {
  return prisma.mission.findMany({
    where: { simulationId },
    orderBy: { order: "asc" },
    include: { situations: { orderBy: { order: "asc" } } },
  });
}

export async function submitDecisionAction(formData: FormData) {
  const user = await requireRole(["APPRENANT", "ADMIN", "FORMATEUR"]);
  const progressId = String(formData.get("progressId"));
  const situationId = String(formData.get("situationId"));
  let choiceId = String(formData.get("choiceId") ?? "");
  const timeTakenRaw = formData.get("timeTakenSeconds");
  const timedOut = formData.get("timedOut") === "true";

  const progress = await prisma.progress.findUniqueOrThrow({ where: { id: progressId } });
  if (progress.userId !== user.id) throw new Error("FORBIDDEN");
  if (progress.currentSituationId !== situationId) {
    // Already answered (double submit / stale page) — just show current feedback state.
    redirect(`/play/${progressId}`);
  }

  if (!choiceId) {
    // Timer expired with no selection: the situation is auto-resolved with its
    // lowest-value outcome, matching "aucune décision" from the product spec.
    const candidates = await prisma.choice.findMany({
      where: { situationId },
      include: { consequence: true },
    });
    const fallback = candidates.sort((a, b) => (a.consequence?.xpAward ?? 0) - (b.consequence?.xpAward ?? 0))[0];
    if (!fallback) throw new Error("Aucun choix disponible pour cette situation.");
    choiceId = fallback.id;
  }

  const choice = await prisma.choice.findUniqueOrThrow({
    where: { id: choiceId },
    include: { consequence: true },
  });
  if (!choice.consequence) throw new Error("Ce choix n'a pas de conséquence définie.");

  const isFirstDecisionEver = (await prisma.decision.count({ where: { progressId } })) === 0;

  await prisma.decision.create({
    data: {
      progressId,
      situationId,
      choiceId,
      timeTakenSeconds: timeTakenRaw ? Number(timeTakenRaw) : null,
      timedOut,
    },
  });

  await applyConsequence(progressId, choice.consequence.id);
  await checkBadgesAfterDecision(progressId, {
    situationId,
    choiceId,
    timeTakenSeconds: timeTakenRaw ? Number(timeTakenRaw) : null,
    isFirstDecisionEver,
  });

  revalidatePath(`/play/${progressId}`);
  redirect(`/play/${progressId}?feedback=${choiceId}`);
}

export async function advanceAction(formData: FormData) {
  const user = await requireRole(["APPRENANT", "ADMIN", "FORMATEUR"]);
  const progressId = String(formData.get("progressId"));

  const progress = await prisma.progress.findUniqueOrThrow({ where: { id: progressId } });
  if (progress.userId !== user.id) throw new Error("FORBIDDEN");

  const lastDecision = await prisma.decision.findFirst({
    where: { progressId },
    orderBy: { createdAt: "desc" },
    include: { choice: { include: { consequence: true } } },
  });

  const missions = await loadOrderedMissions(progress.simulationId);
  const currentMission = missions.find((m) => m.id === progress.currentMissionId);
  if (!currentMission) throw new Error("Mission introuvable");

  const overrideNextId = lastDecision?.choice.consequence?.nextSituationId ?? null;
  let nextSituationId: string | null = null;
  let nextMissionId: string | null = currentMission.id;

  if (overrideNextId) {
    nextSituationId = overrideNextId;
    const owningMission = missions.find((m) => m.situations.some((s) => s.id === overrideNextId));
    nextMissionId = owningMission?.id ?? currentMission.id;
  } else {
    const idx = currentMission.situations.findIndex((s) => s.id === progress.currentSituationId);
    const nextInMission = currentMission.situations[idx + 1];
    if (nextInMission) {
      nextSituationId = nextInMission.id;
    } else {
      // mission complete
      const wasPerfect = await wasPerfectMission(progressId, currentMission.id);
      const isFirstMissionEver =
        (await prisma.decision.count({
          where: { progressId, situation: { missionId: { not: currentMission.id } } },
        })) === 0;
      await checkBadgesAfterMissionComplete(progressId, currentMission.id, { isFirstMissionEver, wasPerfect });

      const missionIdx = missions.findIndex((m) => m.id === currentMission.id);
      const nextMission = missions[missionIdx + 1];
      if (nextMission && nextMission.situations[0]) {
        nextMissionId = nextMission.id;
        nextSituationId = nextMission.situations[0].id;
      } else {
        nextMissionId = null;
        nextSituationId = null;
      }
    }
  }

  if (!nextSituationId) {
    await prisma.progress.update({
      where: { id: progressId },
      data: { status: "COMPLETED", completedAt: new Date(), currentMissionId: null, currentSituationId: null },
    });
    await checkBadgesAfterSimulationComplete(progressId);
    await generateReport(progressId);
    redirect(`/play/${progressId}/report`);
  }

  await prisma.progress.update({
    where: { id: progressId },
    data: { currentMissionId: nextMissionId, currentSituationId: nextSituationId },
  });

  redirect(`/play/${progressId}`);
}

async function wasPerfectMission(progressId: string, missionId: string) {
  const situations = await prisma.situation.findMany({
    where: { missionId },
    include: { choices: { include: { consequence: true } } },
  });
  const decisions = await prisma.decision.findMany({
    where: { progressId, situation: { missionId } },
    include: { choice: { include: { consequence: true } } },
  });

  for (const situation of situations) {
    const bestXP = Math.max(0, ...situation.choices.map((c) => c.consequence?.xpAward ?? 0));
    const decision = decisions.find((d) => d.situationId === situation.id);
    if (!decision || (decision.choice.consequence?.xpAward ?? -1) < bestXP) return false;
  }
  return situations.length > 0;
}
