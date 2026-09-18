"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { passwordSchema } from "@/lib/validation/auth";
import { failResult, okResult, type ActionResult } from "@/lib/action-result";

const profileSchema = z.object({
  firstName: z.string().trim().min(1, "Prénom requis").max(60),
  lastName: z.string().trim().min(1, "Nom requis").max(60),
});

export async function updateProfileAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({ firstName: formData.get("firstName"), lastName: formData.get("lastName") });
  if (!parsed.success) return failResult(parsed.error.issues[0]?.message ?? "Formulaire invalide");
  await prisma.user.update({ where: { id: user.id }, data: parsed.data });
  revalidatePath("/app", "layout");
  return okResult(undefined, "Profil mis à jour.");
}

const passwordChangeSchema = z
  .object({ current: z.string().min(1, "Mot de passe actuel requis"), next: passwordSchema, confirm: z.string() })
  .refine((v) => v.next === v.confirm, { message: "Les deux mots de passe ne correspondent pas", path: ["confirm"] });

export async function changePasswordAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = passwordChangeSchema.safeParse({ current: formData.get("current"), next: formData.get("next"), confirm: formData.get("confirm") });
  if (!parsed.success) return failResult(parsed.error.issues[0]?.message ?? "Formulaire invalide");
  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!dbUser || !(await verifyPassword(parsed.data.current, dbUser.passwordHash))) return failResult("Mot de passe actuel incorrect.");
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(parsed.data.next) } });
  return okResult(undefined, "Mot de passe modifié.");
}
