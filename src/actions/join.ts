"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/auth/rate-limit";
import { getClientIp } from "@/lib/request";

export type JoinLookupState = { error?: string; code?: string };

const codeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{6}$/, "Le code comporte 6 lettres ou chiffres");

/** Vérifie qu'une session existe et est ouverte, puis redirige vers la page de la session. */
export async function lookupSessionAction(_prev: JoinLookupState, formData: FormData): Promise<JoinLookupState> {
  const raw = formData.get("code");
  const parsed = codeSchema.safeParse(typeof raw === "string" ? raw.replace(/[\s-]/g, "") : "");
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Code invalide", code: typeof raw === "string" ? raw : "" };
  }
  const ip = await getClientIp();
  const limit = rateLimit(`join:${ip}`, 30, 10 * 60 * 1000);
  if (!limit.ok) return { error: "Trop de tentatives. Réessayez dans quelques minutes.", code: parsed.data };

  const session = await prisma.gameSession.findUnique({ where: { code: parsed.data }, select: { code: true, status: true } });
  if (!session || session.status === "ENDED") {
    return { error: "Aucune session active ne correspond à ce code. Vérifiez auprès de votre formateur.", code: parsed.data };
  }
  redirect(`/join/${session.code}`);
}
