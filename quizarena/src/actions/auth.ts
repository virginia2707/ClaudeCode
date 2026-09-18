"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { loginSchema, registerSchema } from "@/lib/validation/auth";
import { fieldErrorsFrom, type ActionState } from "@/lib/action-state";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import type { Role } from "@/lib/constants";

function homeFor(role: string): string {
  return role === "LEARNER" ? "/profile" : "/dashboard";
}

function safeNext(next: unknown): string | null {
  if (typeof next !== "string") return null;
  // Only allow same-origin relative paths (prevents open redirects).
  if (!next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ip = await clientIp();
  const rl = rateLimit(`register:${ip}`, 10, 15 * 60 * 1000);
  if (!rl.ok) return { error: "Trop de tentatives. Réessayez dans quelques minutes." };

  const raw = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    role: String(formData.get("role") ?? "TRAINER"),
  };
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error.issues), values: { name: raw.name, email: raw.email, role: raw.role } };
  }
  const { name, email, password, role } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { fieldErrors: { email: "Un compte existe déjà avec cette adresse." }, values: { name, email, role } };
  }

  const user = await prisma.user.create({
    data: { name, email, passwordHash: await hashPassword(password), role },
  });
  await createSession(user.id, user.role as Role);
  redirect(safeNext(formData.get("next")) ?? homeFor(user.role));
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ip = await clientIp();
  const rl = rateLimit(`login:${ip}`, 20, 15 * 60 * 1000);
  if (!rl.ok) return { error: "Trop de tentatives. Réessayez dans quelques minutes." };

  const raw = { email: String(formData.get("email") ?? ""), password: String(formData.get("password") ?? "") };
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error.issues), values: { email: raw.email } };
  }
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  // Constant-time-ish: always run bcrypt even when the user is unknown.
  const ok = await verifyPassword(parsed.data.password, user?.passwordHash ?? "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalid");
  if (!user || !ok) {
    return { error: "E-mail ou mot de passe incorrect.", values: { email: raw.email } };
  }
  await createSession(user.id, user.role as Role);
  redirect(safeNext(formData.get("next")) ?? homeFor(user.role));
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}
