"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { DEFAULT_VARIABLES, PLAN_LIMITS, type PlanValue } from "@/lib/constants";

function randomAccessCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function requireOwnedSimulation(simulationId: string) {
  const user = await requireRole(["FORMATEUR", "ADMIN"]);
  const simulation = await prisma.simulation.findUniqueOrThrow({ where: { id: simulationId } });
  if (user.role !== "ADMIN" && simulation.createdById !== user.id) {
    throw new Error("FORBIDDEN");
  }
  return { user, simulation };
}

export async function createSimulationAction(formData: FormData) {
  const user = await requireRole(["FORMATEUR", "ADMIN"]);

  const title = String(formData.get("title") ?? "").trim();
  const job = String(formData.get("job") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();
  const context = String(formData.get("context") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const durationDays = Number(formData.get("durationDays") ?? 5);

  if (!title || !job || !company) {
    throw new Error("Titre, métier et entreprise sont requis.");
  }

  if (user.role !== "ADMIN") {
    const limit = PLAN_LIMITS[user.plan as PlanValue].simulations;
    if (limit != null) {
      const count = await prisma.simulation.count({ where: { createdById: user.id } });
      if (count >= limit) {
        throw new Error(
          `Votre plan ${user.plan} est limité à ${limit} simulation(s). Passez à un plan supérieur pour en créer davantage.`
        );
      }
    }
  }

  const simulation = await prisma.simulation.create({
    data: {
      title,
      job,
      company,
      context,
      description,
      durationDays,
      createdById: user.id,
    },
  });

  revalidatePath("/formateur");
  redirect(`/formateur/simulations/${simulation.id}`);
}

export async function updateSimulationDetailsAction(simulationId: string, formData: FormData) {
  await requireOwnedSimulation(simulationId);

  await prisma.simulation.update({
    where: { id: simulationId },
    data: {
      title: String(formData.get("title") ?? "").trim(),
      job: String(formData.get("job") ?? "").trim(),
      company: String(formData.get("company") ?? "").trim(),
      context: String(formData.get("context") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      durationDays: Number(formData.get("durationDays") ?? 5),
    },
  });

  revalidatePath(`/formateur/simulations/${simulationId}`);
}

export async function publishSimulationAction(simulationId: string) {
  const { simulation } = await requireOwnedSimulation(simulationId);

  const missionCount = await prisma.mission.count({ where: { simulationId } });
  const situationCount = await prisma.situation.count({ where: { mission: { simulationId } } });
  const choiceCount = await prisma.choice.count({ where: { situation: { mission: { simulationId } } } });
  const consequenceCount = await prisma.consequence.count({
    where: { choice: { situation: { mission: { simulationId } } } },
  });

  if (missionCount === 0 || situationCount === 0 || choiceCount < situationCount * 2 || consequenceCount < choiceCount) {
    throw new Error(
      "La simulation doit avoir au moins une mission, chaque situation au moins 2 choix, et chaque choix une conséquence avant publication."
    );
  }

  await prisma.simulation.update({
    where: { id: simulationId },
    data: {
      status: "PUBLISHED",
      accessCode: simulation.accessCode ?? randomAccessCode(),
    },
  });

  revalidatePath(`/formateur/simulations/${simulationId}`);
}

export async function unpublishSimulationAction(simulationId: string) {
  await requireOwnedSimulation(simulationId);
  await prisma.simulation.update({ where: { id: simulationId }, data: { status: "DRAFT" } });
  revalidatePath(`/formateur/simulations/${simulationId}`);
}

// --- AI-assisted generation (draft only — never auto-published) ---

export async function generateWithAIAction(simulationId: string, formData: FormData) {
  const { user, simulation } = await requireOwnedSimulation(simulationId);
  const level = String(formData.get("level") ?? "Débutant");

  const skills = await prisma.skill.findMany({ where: { simulationId }, orderBy: { order: "asc" } });
  const existingMissionCount = await prisma.mission.count({ where: { simulationId } });

  const { getAIProvider } = await import("@/lib/ai/ai-service");
  const ai = getAIProvider();
  const draft = await ai.generateSimulationDraft({
    job: simulation.job,
    level,
    durationDays: simulation.durationDays,
    skills: skills.map((s) => s.name),
    context: simulation.context,
  });

  for (const [i, m] of draft.missions.entries()) {
    await prisma.mission.create({
      data: {
        simulationId,
        dayNumber: m.dayNumber,
        title: m.title,
        description: m.description,
        context: simulation.context,
        objective: m.objective,
        order: existingMissionCount + i,
      },
    });
  }

  await prisma.aIInteraction.create({
    data: {
      userId: user.id,
      type: "GENERATE_SIMULATION",
      input: JSON.stringify({ simulationId, level }),
      output: JSON.stringify(draft),
    },
  });

  revalidatePath(`/formateur/simulations/${simulationId}`);
}

// --- Skills ---

export async function addSkillAction(simulationId: string, formData: FormData) {
  await requireOwnedSimulation(simulationId);
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const count = await prisma.skill.count({ where: { simulationId } });
  await prisma.skill.create({
    data: {
      simulationId,
      name,
      description: String(formData.get("description") ?? "").trim() || null,
      order: count,
    },
  });
  revalidatePath(`/formateur/simulations/${simulationId}`);
}

export async function deleteSkillAction(simulationId: string, skillId: string) {
  await requireOwnedSimulation(simulationId);
  await prisma.skill.delete({ where: { id: skillId } });
  revalidatePath(`/formateur/simulations/${simulationId}`);
}

// --- Missions ---

export async function createMissionAction(simulationId: string, formData: FormData) {
  await requireOwnedSimulation(simulationId);
  const count = await prisma.mission.count({ where: { simulationId } });

  const mission = await prisma.mission.create({
    data: {
      simulationId,
      dayNumber: Number(formData.get("dayNumber") ?? count + 1),
      title: String(formData.get("title") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      context: String(formData.get("context") ?? "").trim(),
      objective: String(formData.get("objective") ?? "").trim(),
      estimatedDurationMinutes: Number(formData.get("estimatedDurationMinutes") ?? 15),
      difficulty: String(formData.get("difficulty") ?? "MEDIUM"),
      xpAvailable: Number(formData.get("xpAvailable") ?? 150),
      maxScore: Number(formData.get("maxScore") ?? 100),
      order: count,
    },
  });

  revalidatePath(`/formateur/simulations/${simulationId}`);
  redirect(`/formateur/simulations/${simulationId}/missions/${mission.id}`);
}

export async function deleteMissionAction(simulationId: string, missionId: string) {
  await requireOwnedSimulation(simulationId);
  await prisma.mission.delete({ where: { id: missionId } });
  revalidatePath(`/formateur/simulations/${simulationId}`);
}

// --- Situations ---

export async function createSituationAction(simulationId: string, missionId: string, formData: FormData) {
  await requireOwnedSimulation(simulationId);
  const count = await prisma.situation.count({ where: { missionId } });

  await prisma.situation.create({
    data: {
      missionId,
      title: String(formData.get("title") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      difficulty: String(formData.get("difficulty") ?? "MEDIUM"),
      timeLimitSeconds: formData.get("timeLimitSeconds")
        ? Number(formData.get("timeLimitSeconds"))
        : null,
      order: count,
    },
  });

  revalidatePath(`/formateur/simulations/${simulationId}/missions/${missionId}`);
}

export async function deleteSituationAction(simulationId: string, missionId: string, situationId: string) {
  await requireOwnedSimulation(simulationId);
  await prisma.situation.delete({ where: { id: situationId } });
  revalidatePath(`/formateur/simulations/${simulationId}/missions/${missionId}`);
}

// --- Choices + consequences ---

export async function createChoiceAction(
  simulationId: string,
  missionId: string,
  situationId: string,
  formData: FormData
) {
  await requireOwnedSimulation(simulationId);
  const count = await prisma.choice.count({ where: { situationId } });
  const labels = ["A", "B", "C", "D", "E"];

  await prisma.choice.create({
    data: {
      situationId,
      label: labels[count] ?? String(count + 1),
      text: String(formData.get("text") ?? "").trim(),
      order: count,
    },
  });

  revalidatePath(`/formateur/simulations/${simulationId}/missions/${missionId}`);
}

export async function deleteChoiceAction(
  simulationId: string,
  missionId: string,
  choiceId: string
) {
  await requireOwnedSimulation(simulationId);
  await prisma.choice.delete({ where: { id: choiceId } });
  revalidatePath(`/formateur/simulations/${simulationId}/missions/${missionId}`);
}

export async function upsertConsequenceAction(
  simulationId: string,
  missionId: string,
  choiceId: string,
  formData: FormData
) {
  await requireOwnedSimulation(simulationId);

  const variableDeltas: Record<string, number> = {};
  for (const key of DEFAULT_VARIABLES) {
    const raw = formData.get(`var_${key}`);
    const num = Number(raw ?? 0);
    if (num !== 0) variableDeltas[key] = num;
  }

  const skillDeltas: Record<string, number> = {};
  const skillIds = formData.getAll("skillId");
  for (const skillId of skillIds) {
    const delta = Number(formData.get(`skillDelta_${skillId}`) ?? 0);
    if (delta !== 0) skillDeltas[String(skillId)] = delta;
  }

  const nextSituationId = String(formData.get("nextSituationId") ?? "").trim() || null;

  await prisma.consequence.upsert({
    where: { choiceId },
    update: {
      outcomeText: String(formData.get("outcomeText") ?? "").trim(),
      coachFeedback: String(formData.get("coachFeedback") ?? "").trim(),
      variableDeltas: JSON.stringify(variableDeltas),
      skillDeltas: JSON.stringify(skillDeltas),
      xpAward: Number(formData.get("xpAward") ?? 0),
      nextSituationId,
    },
    create: {
      choiceId,
      outcomeText: String(formData.get("outcomeText") ?? "").trim(),
      coachFeedback: String(formData.get("coachFeedback") ?? "").trim(),
      variableDeltas: JSON.stringify(variableDeltas),
      skillDeltas: JSON.stringify(skillDeltas),
      xpAward: Number(formData.get("xpAward") ?? 0),
      nextSituationId,
    },
  });

  revalidatePath(`/formateur/simulations/${simulationId}/missions/${missionId}`);
}

// --- Badges ---

export async function createBadgeAction(simulationId: string, formData: FormData) {
  await requireOwnedSimulation(simulationId);
  await prisma.badge.create({
    data: {
      simulationId,
      code: String(formData.get("code") ?? "").trim(),
      name: String(formData.get("name") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      icon: String(formData.get("icon") ?? "🏅").trim(),
      criteriaType: String(formData.get("criteriaType") ?? "first_decision"),
      criteriaValue: String(formData.get("criteriaValue") ?? "").trim() || null,
    },
  });
  revalidatePath(`/formateur/simulations/${simulationId}`);
}

export async function deleteBadgeAction(simulationId: string, badgeId: string) {
  await requireOwnedSimulation(simulationId);
  await prisma.badge.delete({ where: { id: badgeId } });
  revalidatePath(`/formateur/simulations/${simulationId}`);
}
