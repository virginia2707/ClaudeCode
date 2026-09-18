"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";
import { failResult, okResult, type ActionResult } from "@/lib/action-result";

const skillSchema = z.object({
  name: z.string().trim().min(2, "Nom trop court").max(80, "Nom trop long"),
  description: z.string().trim().max(500, "Description trop longue").optional().default(""),
  category: z.string().trim().max(60).optional().default(""),
});

export type SkillFormState = ActionResult & { values?: Record<string, string> };

export async function createSkillAction(_prev: SkillFormState, formData: FormData): Promise<SkillFormState> {
  const user = await requireRole(["TRAINER", "ADMIN"]);
  const raw = { name: formData.get("name"), description: formData.get("description") ?? "", category: formData.get("category") ?? "" };
  const parsed = skillSchema.safeParse(raw);
  const values = { name: String(raw.name ?? ""), description: String(raw.description), category: String(raw.category) };
  if (!parsed.success) return { ...failResult("Vérifiez le formulaire.", { name: parsed.error.issues[0]?.message ?? "Invalide" }), values };
  const exists = await prisma.skill.findUnique({ where: { ownerId_name: { ownerId: user.id, name: parsed.data.name } } });
  if (exists) return { ...failResult("Cette compétence existe déjà.", { name: "Nom déjà utilisé" }), values };
  await prisma.skill.create({ data: { ownerId: user.id, name: parsed.data.name, description: parsed.data.description, category: parsed.data.category || null } });
  revalidatePath("/app/skills");
  return okResult(undefined, "Compétence ajoutée.");
}

export async function deleteSkillAction(skillId: string): Promise<ActionResult> {
  const user = await requireRole(["TRAINER", "ADMIN"]);
  const skill = await prisma.skill.findFirst({ where: { id: skillId, ownerId: user.id }, include: { _count: { select: { puzzles: true } } } });
  if (!skill) return failResult("Compétence introuvable.");
  if (skill._count.puzzles > 0) return failResult(`Cette compétence est utilisée par ${skill._count.puzzles} énigme(s). Retirez-la d'abord des énigmes.`);
  await prisma.skill.delete({ where: { id: skill.id } });
  revalidatePath("/app/skills");
  return okResult(undefined, "Compétence supprimée.");
}

/** Crée ou récupère des compétences par nom (utilisé par l'éditeur d'énigme et l'IA). */
export async function ensureSkillsByName(ownerId: string, names: string[]) {
  const out: { id: string; name: string }[] = [];
  for (const rawName of names) {
    const name = rawName.trim().slice(0, 80);
    if (!name) continue;
    const skill = await prisma.skill.upsert({
      where: { ownerId_name: { ownerId, name } },
      update: {},
      create: { ownerId, name },
      select: { id: true, name: true },
    });
    out.push(skill);
  }
  return out;
}
