import "server-only";
import { prisma } from "@/lib/prisma";
import { missionInScope, type OrgScope } from "@/lib/data/scope";
import { missionOrderBy, type MissionListParams } from "@/lib/data/mission-filters";
import { PLAN_LIMITS, type Plan } from "@/lib/constants";

export type MissionListItem = Awaited<ReturnType<typeof listMissions>>[number];

export async function listMissions(scope: OrgScope, params: MissionListParams) {
  return prisma.mission.findMany({
    where: {
      organizationId: scope.organizationId,
      ...(params.status === "ALL" ? { status: { not: "ARCHIVED" } } : { status: params.status }),
      ...(params.search
        ? {
            OR: [
              { title: { contains: params.search } },
              { description: { contains: params.search } },
              { sector: { contains: params.search } },
              { jobTitle: { contains: params.search } },
            ],
          }
        : {}),
    },
    orderBy: missionOrderBy(params.sort),
    include: {
      createdBy: { select: { name: true } },
      skills: { include: { skill: { select: { name: true } } } },
      _count: { select: { steps: true, sessions: true, progresses: true } },
    },
    take: 60,
  });
}

/** Compteurs par statut, pour les onglets de la liste. */
export async function missionCountsByStatus(scope: OrgScope) {
  const rows = await prisma.mission.groupBy({
    by: ["status"],
    where: { organizationId: scope.organizationId },
    _count: { _all: true },
  });
  const counts = { DRAFT: 0, IN_REVIEW: 0, PUBLISHED: 0, ARCHIVED: 0 } as Record<string, number>;
  for (const row of rows) counts[row.status] = row._count._all;
  counts.ALL = counts.DRAFT + counts.IN_REVIEW + counts.PUBLISHED;
  return counts;
}

export async function trainerDashboardData(scope: OrgScope, plan: Plan) {
  const [counts, sessions, openSessions, learners, recentMissions, recentSessions, skills] = await Promise.all([
    missionCountsByStatus(scope),
    prisma.session.count({ where: { organizationId: scope.organizationId } }),
    prisma.session.count({ where: { organizationId: scope.organizationId, status: "OPEN" } }),
    prisma.membership.count({ where: { organizationId: scope.organizationId, role: "LEARNER", status: "ACTIVE" } }),
    prisma.mission.findMany({
      where: { organizationId: scope.organizationId, status: { not: "ARCHIVED" } },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: { _count: { select: { steps: true, sessions: true } } },
    }),
    prisma.session.findMany({
      where: { organizationId: scope.organizationId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { mission: { select: { title: true } }, _count: { select: { participants: true } } },
    }),
    prisma.skill.count({ where: { organizationId: scope.organizationId } }),
  ]);

  const limit = PLAN_LIMITS[plan].missions;
  const used = counts.DRAFT + counts.IN_REVIEW + counts.PUBLISHED + counts.ARCHIVED;
  return {
    counts,
    sessions,
    openSessions,
    learners,
    recentMissions,
    recentSessions,
    skills,
    quota: { limit, used, remaining: limit === null ? null : Math.max(0, limit - used), reached: limit !== null && used >= limit },
  };
}

/** Le plan limite le nombre de missions d'une organisation (archivées comprises). */
export async function missionQuota(scope: OrgScope, plan: Plan) {
  const limit = PLAN_LIMITS[plan].missions;
  if (limit === null) return { limit, used: 0, remaining: null, reached: false };
  const used = await prisma.mission.count({ where: { organizationId: scope.organizationId } });
  return { limit, used, remaining: Math.max(0, limit - used), reached: used >= limit };
}

export async function setMissionStatus(scope: OrgScope, missionId: string, status: "DRAFT" | "ARCHIVED") {
  const mission = await missionInScope(scope, missionId);
  return prisma.mission.update({ where: { id: mission.id }, data: { status } });
}

/** Suppression définitive : refusée si la mission a déjà été jouée (traces apprenant). */
export async function deleteMission(scope: OrgScope, missionId: string) {
  const mission = await missionInScope(scope, missionId);
  const progresses = await prisma.learnerProgress.count({ where: { missionId: mission.id } });
  if (progresses > 0) return { deleted: false as const, reason: "PLAYED" as const };
  await prisma.mission.delete({ where: { id: mission.id } });
  return { deleted: true as const };
}

/**
 * Copie profonde d'une mission. Les identifiants internes référencés par le
 * moteur (étape suivante d'une conséquence, étape débloquée, ressource
 * révélée, livrable évalué) sont remappés vers les nouveaux objets, sinon la
 * copie pointerait vers la mission d'origine.
 */
export async function duplicateMission(scope: OrgScope, missionId: string) {
  const source = await prisma.mission.findFirst({
    where: { id: missionId, organizationId: scope.organizationId },
    include: {
      scenario: true,
      learnerRole: true,
      constraints: true,
      skills: true,
      steps: {
        include: {
          tasks: true,
          decisions: { include: { options: { include: { outcome: true } } } },
          // Les critères d'un livrable et d'une étape n'ont pas de missionId :
          // sans ces inclusions, la copie perdrait la grille d'évaluation.
          deliverables: { include: { criteria: true } },
          criteria: true,
          skills: true,
        },
      },
      resources: true,
      datasets: true,
      criteria: true,
    },
  });
  if (!source) throw new Error(`NOT_IN_SCOPE:Mission:${missionId}`);

  return prisma.$transaction(async (tx) => {
    const copy = await tx.mission.create({
      data: {
        organizationId: source.organizationId,
        createdById: scope.userId,
        title: `${source.title} (copie)`,
        description: source.description,
        sector: source.sector,
        jobTitle: source.jobTitle,
        level: source.level,
        difficulty: source.difficulty,
        durationMinutes: source.durationMinutes,
        mode: source.mode,
        objectivesJson: source.objectivesJson,
        expectedOutcome: source.expectedOutcome,
        status: "DRAFT",
        version: 1,
        sourceType: "DUPLICATED",
        duplicatedFromId: source.id,
        scoringMode: source.scoringMode,
        scoringConfigJson: source.scoringConfigJson,
        coachEnabled: source.coachEnabled,
        coachConfigJson: source.coachConfigJson,
      },
    });

    if (source.scenario) {
      const { id: _id, missionId: _m, ...scenario } = source.scenario;
      await tx.scenario.create({ data: { ...scenario, missionId: copy.id } });
    }
    if (source.learnerRole) {
      const { id: _id, missionId: _m, ...role } = source.learnerRole;
      await tx.learnerRole.create({ data: { ...role, missionId: copy.id } });
    }
    for (const c of source.constraints) {
      const { id: _id, missionId: _m, ...rest } = c;
      await tx.constraint.create({ data: { ...rest, missionId: copy.id } });
    }
    for (const ms of source.skills) {
      const { id: _id, missionId: _m, ...rest } = ms;
      await tx.missionSkill.create({ data: { ...rest, missionId: copy.id } });
    }

    // Étapes d'abord : les autres entités et le branching en dépendent.
    const stepIdMap = new Map<string, string>();
    for (const step of source.steps) {
      const created = await tx.missionStep.create({
        data: {
          missionId: copy.id,
          order: step.order,
          key: step.key,
          title: step.title,
          objective: step.objective,
          context: step.context,
          instruction: step.instruction,
          stepType: step.stepType,
          estimatedMinutes: step.estimatedMinutes,
          isOptional: step.isOptional,
          isLocked: step.isLocked,
          unlockRuleJson: step.unlockRuleJson,
          maxScore: step.maxScore,
          successCriteria: step.successCriteria,
          feedbackSuccess: step.feedbackSuccess,
          feedbackPartial: step.feedbackPartial,
          feedbackFailure: step.feedbackFailure,
        },
      });
      stepIdMap.set(step.id, created.id);
    }

    const resourceIdMap = new Map<string, string>();
    for (const r of source.resources) {
      const { id: _id, missionId: _m, stepId, ...rest } = r;
      const created = await tx.resource.create({
        data: { ...rest, missionId: copy.id, stepId: stepId ? (stepIdMap.get(stepId) ?? null) : null },
      });
      resourceIdMap.set(r.id, created.id);
    }
    for (const d of source.datasets) {
      const { id: _id, missionId: _m, stepId, ...rest } = d;
      await tx.dataSet.create({ data: { ...rest, missionId: copy.id, stepId: stepId ? (stepIdMap.get(stepId) ?? null) : null } });
    }

    for (const step of source.steps) {
      const newStepId = stepIdMap.get(step.id)!;
      for (const t of step.tasks) {
        const { id: _id, stepId: _s, ...rest } = t;
        await tx.task.create({ data: { ...rest, stepId: newStepId } });
      }
      for (const sk of step.skills) {
        const { id: _id, stepId: _s, ...rest } = sk;
        await tx.stepSkill.create({ data: { ...rest, stepId: newStepId } });
      }
      for (const c of step.criteria) {
        const { id: _id, missionId: _m, stepId: _s, deliverableId: _d, ...rest } = c;
        await tx.evaluationCriteria.create({ data: { ...rest, stepId: newStepId } });
      }
      for (const del of step.deliverables) {
        const { id: _id, stepId: _s, criteria, ...rest } = del;
        const created = await tx.deliverable.create({ data: { ...rest, stepId: newStepId } });
        for (const c of criteria) {
          const { id: _cid, missionId: _m, stepId: _cs, deliverableId: _d, ...criterion } = c;
          await tx.evaluationCriteria.create({ data: { ...criterion, deliverableId: created.id } });
        }
      }
      for (const dec of step.decisions) {
        const created = await tx.decision.create({
          data: {
            stepId: newStepId,
            order: dec.order,
            title: dec.title,
            prompt: dec.prompt,
            allowMultiple: dec.allowMultiple,
            requireJustification: dec.requireJustification,
            maxScore: dec.maxScore,
          },
        });
        for (const opt of dec.options) {
          const { id: _id, decisionId: _d, outcome, ...rest } = opt;
          const newOption = await tx.decisionOption.create({ data: { ...rest, decisionId: created.id } });
          if (outcome) {
            const { id: _oid, optionId: _o, revealResourceId, unlockStepId, nextStepId, ...outcomeRest } = outcome;
            await tx.decisionOutcome.create({
              data: {
                ...outcomeRest,
                optionId: newOption.id,
                revealResourceId: revealResourceId ? (resourceIdMap.get(revealResourceId) ?? null) : null,
                unlockStepId: unlockStepId ? (stepIdMap.get(unlockStepId) ?? null) : null,
                nextStepId: nextStepId ? (stepIdMap.get(nextStepId) ?? null) : null,
              },
            });
          }
        }
      }
    }

    // Critères de bilan global (rattachés à la mission elle-même).
    for (const c of source.criteria) {
      const { id: _id, missionId: _m, stepId: _s, deliverableId: _d, ...rest } = c;
      await tx.evaluationCriteria.create({ data: { ...rest, missionId: copy.id } });
    }

    return copy;
  });
}
