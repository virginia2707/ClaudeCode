"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authorizeAction } from "@/lib/auth/current-user";
import { logAudit } from "@/lib/audit";
import { deleteMission, duplicateMission, missionQuota, setMissionStatus } from "@/lib/data/missions";
import { missionIdSchema } from "@/lib/data/schemas";
import { NotInScopeError, type OrgScope } from "@/lib/data/scope";
import { ForbiddenError } from "@/lib/authz/permissions";
import type { FormState } from "@/lib/auth/schemas";
import type { Plan } from "@/lib/constants";

const LIST = "/app/trainer/missions";

function toFormError(e: unknown): FormState {
  if (e instanceof ForbiddenError) return { error: "Vous n'avez pas les droits pour cette action." };
  if (e instanceof NotInScopeError) return { error: "Mission introuvable dans cette organisation." };
  if (e instanceof Error && e.message === "UNAUTHENTICATED") return { error: "Session expirée. Reconnectez-vous." };
  if (e instanceof Error && e.message.startsWith("NOT_IN_SCOPE")) return { error: "Mission introuvable dans cette organisation." };
  throw e;
}

async function scopeFor(permission: Parameters<typeof authorizeAction>[0]) {
  const { user, membership } = await authorizeAction(permission);
  const scope: OrgScope = { organizationId: membership.organizationId, userId: user.id };
  return { scope, membership, user };
}

export async function duplicateMissionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const { scope, membership, user } = await scopeFor("mission:duplicate");
    const parsed = missionIdSchema.safeParse({ missionId: formData.get("missionId") });
    if (!parsed.success) return { error: "Mission invalide." };

    const quota = await missionQuota(scope, membership.organization.plan as Plan);
    if (quota.reached) {
      return { error: `Votre plan ${membership.organization.plan} est limité à ${quota.limit} missions. Archivez ou supprimez une mission, ou changez de plan.` };
    }

    const copy = await duplicateMission(scope, parsed.data.missionId);
    await logAudit({ organizationId: scope.organizationId, userId: user.id, action: "mission.duplicate", targetType: "Mission", targetId: copy.id, meta: { from: parsed.data.missionId } });
    revalidatePath(LIST);
    return { success: `« ${copy.title} » a été créée comme brouillon.` };
  } catch (e) {
    return toFormError(e);
  }
}

export async function archiveMissionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const { scope, user } = await scopeFor("mission:update");
    const parsed = missionIdSchema.safeParse({ missionId: formData.get("missionId") });
    if (!parsed.success) return { error: "Mission invalide." };
    const target = String(formData.get("target") ?? "ARCHIVED") === "DRAFT" ? "DRAFT" : "ARCHIVED";
    const mission = await setMissionStatus(scope, parsed.data.missionId, target);
    await logAudit({ organizationId: scope.organizationId, userId: user.id, action: target === "ARCHIVED" ? "mission.archive" : "mission.restore", targetType: "Mission", targetId: mission.id });
    revalidatePath(LIST);
    return { success: target === "ARCHIVED" ? "Mission archivée." : "Mission restaurée en brouillon." };
  } catch (e) {
    return toFormError(e);
  }
}

export async function deleteMissionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const { scope, user } = await scopeFor("mission:delete");
    const parsed = missionIdSchema.safeParse({ missionId: formData.get("missionId") });
    if (!parsed.success) return { error: "Mission invalide." };
    const result = await deleteMission(scope, parsed.data.missionId);
    if (!result.deleted) {
      return { error: "Cette mission a déjà été jouée par des apprenants : elle ne peut pas être supprimée. Archivez-la pour conserver les résultats." };
    }
    await logAudit({ organizationId: scope.organizationId, userId: user.id, action: "mission.delete", targetType: "Mission", targetId: parsed.data.missionId });
    revalidatePath(LIST);
    return { success: "Mission supprimée." };
  } catch (e) {
    return toFormError(e);
  }
}

/** Redirection vers le futur Mission Builder (phase 5). */
export async function openMissionAction(formData: FormData) {
  await authorizeAction("mission:read");
  redirect(`/app/trainer/missions/${String(formData.get("missionId") ?? "")}`);
}
