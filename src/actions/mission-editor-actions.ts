"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authorizeAction } from "@/lib/auth/current-user";
import { fieldErrorsFrom, formString, type FormState } from "@/lib/auth/schemas";
import { logAudit } from "@/lib/audit";
import { track } from "@/lib/analytics/track";
import { ForbiddenError } from "@/lib/authz/permissions";
import { MissionLockedError, NotInScopeError, type OrgScope } from "@/lib/data/scope";
import { missionQuota } from "@/lib/data/missions";
import {
  addConstraint,
  createMission,
  deleteConstraint,
  setMissionSkills,
  updateMissionBasics,
  updateMissionSettings,
  upsertLearnerRole,
  upsertScenario,
} from "@/lib/data/mission-editor";
import { constraintSchema, learnerRoleSchema, missionBasicsSchema, missionSettingsSchema, scenarioSchema } from "@/lib/data/mission-schemas";
import type { Plan } from "@/lib/constants";

function toFormError(e: unknown): FormState {
  if (e instanceof ForbiddenError) return { error: "Vous n'avez pas les droits pour cette action." };
  if (e instanceof NotInScopeError) return { error: "Mission introuvable dans cette organisation." };
  if (e instanceof MissionLockedError)
    return { error: "Cette mission est publiée et ne peut plus être modifiée. Dupliquez-la pour travailler sur une nouvelle version, ou archivez-la." };
  if (e instanceof Error && e.message === "UNAUTHENTICATED") return { error: "Session expirée. Reconnectez-vous." };
  throw e;
}

async function editorScope(permission: Parameters<typeof authorizeAction>[0]) {
  const { user, membership } = await authorizeAction(permission);
  const scope: OrgScope = { organizationId: membership.organizationId, userId: user.id };
  return { scope, membership };
}

function basicsFrom(formData: FormData) {
  return {
    title: formString(formData, "title"),
    description: formString(formData, "description"),
    sector: formString(formData, "sector"),
    jobTitle: formString(formData, "jobTitle"),
    level: formString(formData, "level"),
    difficulty: formString(formData, "difficulty"),
    durationMinutes: formString(formData, "durationMinutes"),
    mode: formString(formData, "mode"),
  };
}

export async function createMissionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  let missionId: string;
  const values = basicsFrom(formData);
  try {
    const { scope, membership } = await editorScope("mission:create");
    const parsed = missionBasicsSchema.safeParse(values);
    if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };

    const quota = await missionQuota(scope, membership.organization.plan as Plan);
    if (quota.reached) {
      return {
        error: `Votre plan ${membership.organization.plan} est limité à ${quota.limit} missions. Archivez ou supprimez une mission avant d'en créer une nouvelle.`,
        values,
      };
    }

    const mission = await createMission(scope, parsed.data);
    await logAudit({ organizationId: scope.organizationId, userId: scope.userId, action: "mission.create", targetType: "Mission", targetId: mission.id, meta: { title: mission.title } });
    await track({ name: "mission_created", organizationId: scope.organizationId, userId: scope.userId, missionId: mission.id, properties: { mode: mission.mode, difficulty: mission.difficulty } });
    missionId = mission.id;
  } catch (e) {
    return toFormError(e);
  }
  // `redirect` lève une exception de contrôle : hors du bloc try.
  redirect(`/app/trainer/missions/${missionId}`);
}

export async function updateMissionBasicsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const { scope } = await editorScope("mission:update");
    const missionId = formString(formData, "missionId");
    const parsed = missionBasicsSchema.safeParse(basicsFrom(formData));
    if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };
    await updateMissionBasics(scope, missionId, parsed.data);
    revalidatePath(`/app/trainer/missions/${missionId}`);
    return { success: "Fiche enregistrée." };
  } catch (e) {
    return toFormError(e);
  }
}

export async function updateMissionSettingsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const { scope } = await editorScope("mission:update");
    const missionId = formString(formData, "missionId");
    const parsed = missionSettingsSchema.safeParse({
      objectives: formString(formData, "objectives"),
      expectedOutcome: formString(formData, "expectedOutcome"),
      scoringMode: formString(formData, "scoringMode"),
      coachEnabled: formString(formData, "coachEnabled"),
    });
    if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };
    await updateMissionSettings(scope, missionId, parsed.data);
    revalidatePath(`/app/trainer/missions/${missionId}`);
    return { success: "Objectifs et réglages enregistrés." };
  } catch (e) {
    return toFormError(e);
  }
}

export async function updateScenarioAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const { scope } = await editorScope("mission:update");
    const missionId = formString(formData, "missionId");
    const parsed = scenarioSchema.safeParse({
      companyName: formString(formData, "companyName"),
      setting: formString(formData, "setting"),
      context: formString(formData, "context"),
      problem: formString(formData, "problem"),
      stakes: formString(formData, "stakes"),
      timeframe: formString(formData, "timeframe"),
      briefing: formString(formData, "briefing"),
      openingMessage: formString(formData, "openingMessage"),
    });
    if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };
    await upsertScenario(scope, missionId, parsed.data);
    revalidatePath(`/app/trainer/missions/${missionId}`);
    return { success: "Briefing enregistré." };
  } catch (e) {
    return toFormError(e);
  }
}

export async function updateLearnerRoleAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const { scope } = await editorScope("mission:update");
    const missionId = formString(formData, "missionId");
    const parsed = learnerRoleSchema.safeParse({
      title: formString(formData, "roleTitle"),
      department: formString(formData, "department"),
      seniority: formString(formData, "seniority"),
      reportsTo: formString(formData, "reportsTo"),
      responsibilities: formString(formData, "responsibilities"),
    });
    if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };
    await upsertLearnerRole(scope, missionId, parsed.data);
    revalidatePath(`/app/trainer/missions/${missionId}`);
    return { success: "Rôle de l'apprenant enregistré." };
  } catch (e) {
    return toFormError(e);
  }
}

export async function addConstraintAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const { scope } = await editorScope("mission:update");
    const missionId = formString(formData, "missionId");
    const parsed = constraintSchema.safeParse({
      label: formString(formData, "label"),
      type: formString(formData, "type"),
      operator: formString(formData, "operator"),
      value: formString(formData, "value"),
      unit: formString(formData, "unit"),
      description: formString(formData, "description"),
    });
    if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };
    const constraint = await addConstraint(scope, missionId, parsed.data);
    revalidatePath(`/app/trainer/missions/${missionId}`);
    return { success: `Contrainte « ${constraint.label} » ajoutée (clé ${constraint.key}).` };
  } catch (e) {
    return toFormError(e);
  }
}

export async function deleteConstraintAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const { scope } = await editorScope("mission:update");
    const missionId = formString(formData, "missionId");
    const removed = await deleteConstraint(scope, missionId, formString(formData, "constraintId"));
    if (!removed) return { error: "Contrainte introuvable." };
    revalidatePath(`/app/trainer/missions/${missionId}`);
    return { success: "Contrainte supprimée." };
  } catch (e) {
    return toFormError(e);
  }
}

export async function setMissionSkillsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const { scope } = await editorScope("mission:update");
    const missionId = formString(formData, "missionId");
    const skillIds = formData.getAll("skillIds").map(String).filter(Boolean).slice(0, 20);
    const count = await setMissionSkills(scope, missionId, skillIds);
    revalidatePath(`/app/trainer/missions/${missionId}`);
    return { success: count === 0 ? "Aucune compétence sélectionnée." : `${count} compétence${count > 1 ? "s" : ""} enregistrée${count > 1 ? "s" : ""}.` };
  } catch (e) {
    return toFormError(e);
  }
}
