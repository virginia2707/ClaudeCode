import { prisma } from "@/lib/prisma";

async function award(progressId: string, badgeId: string) {
  await prisma.userBadge.upsert({
    where: { progressId_badgeId: { progressId, badgeId } },
    update: {},
    create: { progressId, badgeId },
  });
}

async function unearnedBadges(simulationId: string, progressId: string, criteriaType: string) {
  return prisma.badge.findMany({
    where: {
      simulationId,
      criteriaType,
      userBadges: { none: { progressId } },
    },
  });
}

export async function checkBadgesAfterDecision(
  progressId: string,
  opts: { situationId: string; choiceId: string; timeTakenSeconds?: number | null; isFirstDecisionEver: boolean }
) {
  const progress = await prisma.progress.findUniqueOrThrow({ where: { id: progressId } });

  if (opts.isFirstDecisionEver) {
    const badges = await unearnedBadges(progress.simulationId, progressId, "first_decision");
    for (const b of badges) await award(progressId, b.id);
  }

  if (opts.timeTakenSeconds != null) {
    const badges = await unearnedBadges(progress.simulationId, progressId, "fast_decision");
    for (const b of badges) {
      const threshold = Number(b.criteriaValue ?? "10");
      if (opts.timeTakenSeconds <= threshold) await award(progressId, b.id);
    }
  }
}

export async function checkBadgesAfterMissionComplete(
  progressId: string,
  missionId: string,
  opts: { isFirstMissionEver: boolean; wasPerfect: boolean }
) {
  const progress = await prisma.progress.findUniqueOrThrow({ where: { id: progressId } });
  const mission = await prisma.mission.findUniqueOrThrow({ where: { id: missionId } });

  if (opts.isFirstMissionEver) {
    const badges = await unearnedBadges(progress.simulationId, progressId, "first_mission");
    for (const b of badges) await award(progressId, b.id);
  }

  const completeBadges = await unearnedBadges(progress.simulationId, progressId, "mission_complete");
  for (const b of completeBadges) {
    if (!b.criteriaValue || Number(b.criteriaValue) === mission.dayNumber) {
      await award(progressId, b.id);
    }
  }

  if (opts.wasPerfect) {
    const perfectBadges = await unearnedBadges(progress.simulationId, progressId, "perfect_mission");
    for (const b of perfectBadges) {
      if (!b.criteriaValue || Number(b.criteriaValue) === mission.dayNumber) {
        await award(progressId, b.id);
      }
    }
  }
}

export async function checkBadgesAfterSimulationComplete(progressId: string) {
  const progress = await prisma.progress.findUniqueOrThrow({ where: { id: progressId } });
  const badges = await unearnedBadges(progress.simulationId, progressId, "simulation_complete");
  for (const b of badges) await award(progressId, b.id);

  const skillBadges = await unearnedBadges(progress.simulationId, progressId, "skill_threshold");
  const userSkills = await prisma.userSkill.findMany({
    where: { progressId },
    include: { skill: true },
  });
  for (const b of skillBadges) {
    const [skillName, thresholdRaw] = (b.criteriaValue ?? "").split(":");
    const threshold = Number(thresholdRaw ?? "80");
    const match = userSkills.find((us) => us.skill.name === skillName);
    if (match && match.score >= threshold) await award(progressId, b.id);
  }
}
