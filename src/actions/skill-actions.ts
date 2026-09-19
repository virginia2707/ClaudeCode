"use server";

import { revalidatePath } from "next/cache";
import { authorizeAction } from "@/lib/auth/current-user";
import { logAudit } from "@/lib/audit";
import { createSkill, deleteSkill, importGlobalSkill, updateSkill } from "@/lib/data/skills";
import { skillIdSchema, skillSchema } from "@/lib/data/schemas";
import { NotInScopeError, type OrgScope } from "@/lib/data/scope";
import { ForbiddenError } from "@/lib/authz/permissions";
import { fieldErrorsFrom, formString, type FormState } from "@/lib/auth/schemas";

const PAGE = "/app/trainer/skills";

function toFormError(e: unknown): FormState {
  if (e instanceof ForbiddenError) return { error: "Vous n'avez pas les droits pour gérer les compétences." };
  if (e instanceof NotInScopeError) return { error: "Compétence introuvable dans cette organisation." };
  if (e instanceof Error && e.message === "UNAUTHENTICATED") return { error: "Session expirée. Reconnectez-vous." };
  throw e;
}

async function scope(): Promise<OrgScope & { userId: string }> {
  const { user, membership } = await authorizeAction("skill:manage");
  return { organizationId: membership.organizationId, userId: user.id };
}

export async function createSkillAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const s = await scope();
    const parsed = skillSchema.safeParse({
      name: formString(formData, "name"),
      description: formString(formData, "description"),
      category: formString(formData, "category"),
    });
    if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };
    const skill = await createSkill(s, parsed.data);
    await logAudit({ organizationId: s.organizationId, userId: s.userId, action: "skill.create", targetType: "Skill", targetId: skill.id, meta: { name: skill.name } });
    revalidatePath(PAGE);
    return { success: `Compétence « ${skill.name} » ajoutée.` };
  } catch (e) {
    return toFormError(e);
  }
}

export async function updateSkillAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const s = await scope();
    const id = skillIdSchema.safeParse({ skillId: formData.get("skillId") });
    const parsed = skillSchema.safeParse({
      name: formString(formData, "name"),
      description: formString(formData, "description"),
      category: formString(formData, "category"),
    });
    if (!id.success) return { error: "Compétence invalide." };
    if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };
    const skill = await updateSkill(s, id.data.skillId, parsed.data);
    await logAudit({ organizationId: s.organizationId, userId: s.userId, action: "skill.update", targetType: "Skill", targetId: skill.id });
    revalidatePath(PAGE);
    return { success: "Compétence mise à jour." };
  } catch (e) {
    return toFormError(e);
  }
}

export async function deleteSkillAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const s = await scope();
    const id = skillIdSchema.safeParse({ skillId: formData.get("skillId") });
    if (!id.success) return { error: "Compétence invalide." };
    const result = await deleteSkill(s, id.data.skillId);
    if (!result.deleted) {
      return { error: `Cette compétence est utilisée par ${result.usedBy} élément${result.usedBy > 1 ? "s" : ""} de mission : retirez-la d'abord.` };
    }
    await logAudit({ organizationId: s.organizationId, userId: s.userId, action: "skill.delete", targetType: "Skill", targetId: id.data.skillId });
    revalidatePath(PAGE);
    return { success: "Compétence supprimée." };
  } catch (e) {
    return toFormError(e);
  }
}

export async function importSkillAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const s = await scope();
    const id = skillIdSchema.safeParse({ skillId: formData.get("skillId") });
    if (!id.success) return { error: "Compétence invalide." };
    const skill = await importGlobalSkill(s, id.data.skillId);
    revalidatePath(PAGE);
    if (!skill) return { error: "Cette compétence est déjà dans votre référentiel." };
    await logAudit({ organizationId: s.organizationId, userId: s.userId, action: "skill.import", targetType: "Skill", targetId: skill.id });
    return { success: `« ${skill.name} » ajoutée à votre référentiel.` };
  } catch (e) {
    return toFormError(e);
  }
}
