import { prisma } from "@/lib/prisma";
import { DEFAULT_VARIABLES } from "@/lib/constants";

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

type VariableMap = Record<string, number>;

function baselineVariables(): VariableMap {
  const map: VariableMap = {};
  for (const v of DEFAULT_VARIABLES) map[v] = 50;
  return map;
}

/**
 * Applies a choice's consequence to a progress: updates the tracked
 * business variables, skill scores, XP total and the overall performance
 * score. Returns the updated progress row.
 */
export async function applyConsequence(progressId: string, consequenceId: string) {
  const [progress, consequence] = await Promise.all([
    prisma.progress.findUniqueOrThrow({ where: { id: progressId } }),
    prisma.consequence.findUniqueOrThrow({ where: { id: consequenceId } }),
  ]);

  const variables: VariableMap = {
    ...baselineVariables(),
    ...JSON.parse(progress.variablesJson || "{}"),
  };
  const variableDeltas: VariableMap = JSON.parse(consequence.variableDeltas || "{}");
  for (const [key, delta] of Object.entries(variableDeltas)) {
    variables[key] = clamp((variables[key] ?? 50) + delta);
  }

  const skillDeltas: VariableMap = JSON.parse(consequence.skillDeltas || "{}");
  for (const [skillId, delta] of Object.entries(skillDeltas)) {
    const existing = await prisma.userSkill.findUnique({
      where: { progressId_skillId: { progressId, skillId } },
    });
    const nextScore = clamp((existing?.score ?? 40) + delta);
    await prisma.userSkill.upsert({
      where: { progressId_skillId: { progressId, skillId } },
      update: { score: nextScore },
      create: { progressId, skillId, score: nextScore },
    });
  }

  const score = Math.round(
    Object.values(variables).reduce((a, b) => a + b, 0) / Object.values(variables).length
  );

  const updated = await prisma.progress.update({
    where: { id: progressId },
    data: {
      variablesJson: JSON.stringify(variables),
      score,
      xp: progress.xp + consequence.xpAward,
    },
  });

  if (consequence.xpAward !== 0) {
    await prisma.xPTransaction.create({
      data: {
        progressId,
        amount: consequence.xpAward,
        reason: "Décision prise",
      },
    });
  }

  return updated;
}

export async function awardXP(progressId: string, amount: number, reason: string) {
  await prisma.$transaction([
    prisma.progress.update({ where: { id: progressId }, data: { xp: { increment: amount } } }),
    prisma.xPTransaction.create({ data: { progressId, amount, reason } }),
  ]);
}
