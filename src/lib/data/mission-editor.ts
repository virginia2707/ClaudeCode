import "server-only";
import { prisma } from "@/lib/prisma";
import { editableMissionInScope, type OrgScope } from "@/lib/data/scope";
import { slugify } from "@/lib/auth/slug";
import { parseObjectives } from "@/lib/data/mission-schemas";
import type { z } from "zod";
import type { constraintSchema, learnerRoleSchema, missionBasicsSchema, missionSettingsSchema, scenarioSchema } from "@/lib/data/mission-schemas";

type Basics = z.infer<typeof missionBasicsSchema>;
type Settings = z.infer<typeof missionSettingsSchema>;
type Scenario = z.infer<typeof scenarioSchema>;
type LearnerRole = z.infer<typeof learnerRoleSchema>;
type Constraint = z.infer<typeof constraintSchema>;

const orEmpty = (v: string | undefined) => v ?? "";
const orNull = (v: string | undefined) => (v && v.length > 0 ? v : null);

export async function createMission(scope: OrgScope, input: Basics) {
  return prisma.mission.create({
    data: {
      organizationId: scope.organizationId,
      createdById: scope.userId,
      title: input.title,
      description: orEmpty(input.description),
      sector: orNull(input.sector),
      jobTitle: orNull(input.jobTitle),
      level: input.level,
      difficulty: input.difficulty,
      durationMinutes: input.durationMinutes,
      mode: input.mode,
      status: "DRAFT",
      sourceType: "MANUAL",
    },
  });
}

/** Mission complète pour l'écran d'édition, cloisonnée par organisation. */
export async function getMissionForEdit(scope: OrgScope, missionId: string) {
  const mission = await prisma.mission.findFirst({
    where: { id: missionId, organizationId: scope.organizationId },
    include: {
      scenario: true,
      learnerRole: true,
      constraints: { orderBy: { order: "asc" } },
      skills: { include: { skill: { select: { id: true, name: true, category: true } } } },
      steps: { orderBy: { order: "asc" }, select: { id: true, title: true, stepType: true, order: true } },
      createdBy: { select: { name: true } },
      _count: { select: { sessions: true, progresses: true, resources: true, datasets: true } },
    },
  });
  return mission;
}

export async function updateMissionBasics(scope: OrgScope, missionId: string, input: Basics) {
  const mission = await editableMissionInScope(scope, missionId);
  return prisma.mission.update({
    where: { id: mission.id },
    data: {
      title: input.title,
      description: orEmpty(input.description),
      sector: orNull(input.sector),
      jobTitle: orNull(input.jobTitle),
      level: input.level,
      difficulty: input.difficulty,
      durationMinutes: input.durationMinutes,
      mode: input.mode,
    },
  });
}

export async function updateMissionSettings(scope: OrgScope, missionId: string, input: Settings) {
  const mission = await editableMissionInScope(scope, missionId);
  return prisma.mission.update({
    where: { id: mission.id },
    data: {
      objectivesJson: JSON.stringify(parseObjectives(input.objectives)),
      expectedOutcome: orEmpty(input.expectedOutcome),
      scoringMode: input.scoringMode,
      coachEnabled: input.coachEnabled === "on",
    },
  });
}

export async function upsertScenario(scope: OrgScope, missionId: string, input: Scenario) {
  const mission = await editableMissionInScope(scope, missionId);
  const data = {
    companyName: orEmpty(input.companyName),
    setting: orEmpty(input.setting),
    context: orEmpty(input.context),
    problem: orEmpty(input.problem),
    stakes: orEmpty(input.stakes),
    timeframe: orEmpty(input.timeframe),
    briefing: orEmpty(input.briefing),
    openingMessage: orEmpty(input.openingMessage),
  };
  return prisma.scenario.upsert({
    where: { missionId: mission.id },
    create: { missionId: mission.id, ...data },
    update: data,
  });
}

export async function upsertLearnerRole(scope: OrgScope, missionId: string, input: LearnerRole) {
  const mission = await editableMissionInScope(scope, missionId);
  const data = {
    title: input.title,
    department: orEmpty(input.department),
    seniority: orEmpty(input.seniority),
    reportsTo: orEmpty(input.reportsTo),
    responsibilities: orEmpty(input.responsibilities),
  };
  return prisma.learnerRole.upsert({
    where: { missionId: mission.id },
    create: { missionId: mission.id, ...data },
    update: data,
  });
}

/** La clé sert au moteur à comparer les coûts d'une décision à la contrainte. */
export async function addConstraint(scope: OrgScope, missionId: string, input: Constraint) {
  const mission = await editableMissionInScope(scope, missionId);
  const existing = await prisma.constraint.findMany({ where: { missionId: mission.id }, select: { key: true, order: true } });
  const taken = new Set(existing.map((c) => c.key));
  const base = slugify(input.label).replace(/-/g, "_") || "contrainte";
  let key = base;
  for (let i = 2; taken.has(key) && i < 50; i++) key = `${base}_${i}`;

  return prisma.constraint.create({
    data: {
      missionId: mission.id,
      key,
      label: input.label,
      type: input.type,
      operator: input.operator,
      value: input.value,
      unit: orNull(input.unit),
      description: orEmpty(input.description),
      order: existing.length,
    },
  });
}

export async function deleteConstraint(scope: OrgScope, missionId: string, constraintId: string) {
  const mission = await editableMissionInScope(scope, missionId);
  const constraint = await prisma.constraint.findFirst({ where: { id: constraintId, missionId: mission.id } });
  if (!constraint) return false;
  await prisma.constraint.delete({ where: { id: constraint.id } });
  return true;
}

/** Remplace la liste des compétences mobilisées par la mission. */
export async function setMissionSkills(scope: OrgScope, missionId: string, skillIds: string[]) {
  const mission = await editableMissionInScope(scope, missionId);
  // Ne garder que des compétences réellement accessibles à l'organisation.
  const allowed = await prisma.skill.findMany({
    where: { id: { in: skillIds }, OR: [{ organizationId: mission.organizationId }, { organizationId: null }] },
    select: { id: true },
  });
  const allowedIds = allowed.map((s) => s.id);
  await prisma.$transaction([
    prisma.missionSkill.deleteMany({ where: { missionId: mission.id, skillId: { notIn: allowedIds.length > 0 ? allowedIds : ["__none__"] } } }),
    ...allowedIds.map((skillId) =>
      prisma.missionSkill.upsert({
        where: { missionId_skillId: { missionId: mission.id, skillId } },
        create: { missionId: mission.id, skillId },
        update: {},
      }),
    ),
  ]);
  return allowedIds.length;
}
