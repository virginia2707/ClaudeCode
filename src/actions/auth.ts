"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession, getCurrentUser, homeForRole } from "@/lib/auth/session";
import { rateLimit, resetRateLimit } from "@/lib/auth/rate-limit";
import { getClientIp } from "@/lib/request";
import { fieldErrors, loginSchema, registerSchema } from "@/lib/validation/auth";
import type { Role } from "@/lib/constants";

export type AuthFormState = {
  error?: string;
  fields?: Record<string, string>;
  values?: Record<string, string>;
};

function pick(formData: FormData, keys: string[]) {
  const out: Record<string, string> = {};
  for (const k of keys) {
    const v = formData.get(k);
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

/** Cible de redirection sûre (chemin relatif interne uniquement). */
function safeNext(raw: FormDataEntryValue | null, fallback: string) {
  if (typeof raw !== "string") return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return fallback;
  return raw;
}

export async function registerAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = pick(formData, ["firstName", "lastName", "email", "accountType"]);
  const parsed = registerSchema.safeParse({
    ...values,
    password: formData.get("password"),
    acceptTerms: formData.get("acceptTerms") === "on",
  });
  if (!parsed.success) {
    return { fields: fieldErrors(parsed.error), values };
  }

  const ip = await getClientIp();
  const limit = rateLimit(`register:${ip}`, 10, 60 * 60 * 1000);
  if (!limit.ok) {
    return { error: "Trop de tentatives. Réessayez dans quelques minutes.", values };
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } });
  if (existing) {
    return { fields: { email: "Un compte existe déjà avec cette adresse" }, values };
  }

  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      passwordHash: await hashPassword(parsed.data.password),
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      role: parsed.data.accountType,
      lastLoginAt: new Date(),
    },
    select: { id: true, role: true },
  });

  // Chaque nouveau formateur reçoit la démo jouable : le produit est
  // immédiatement démontrable. Un échec ici ne doit pas bloquer l'inscription.
  if (user.role === "TRAINER") {
    try {
      const { createDemoGame } = await import("@/lib/demo/excel-demo");
      await createDemoGame(user.id);
    } catch (error) {
      console.error("createDemoGame failed", error);
    }
  }

  await createSession(user);
  redirect(safeNext(formData.get("next"), homeForRole(user.role as Role)));
}

export async function loginAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = pick(formData, ["email"]);
  const parsed = loginSchema.safeParse({ email: values.email, password: formData.get("password") });
  if (!parsed.success) {
    return { fields: fieldErrors(parsed.error), values };
  }

  const ip = await getClientIp();
  const key = `login:${ip}:${parsed.data.email}`;
  const limit = rateLimit(key, 8, 15 * 60 * 1000);
  if (!limit.ok) {
    return { error: `Trop de tentatives. Réessayez dans ${Math.ceil(limit.retryAfterSeconds / 60)} min.`, values };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  // Comparaison à durée constante même si l'utilisateur n'existe pas.
  const ok = user ? await verifyPassword(parsed.data.password, user.passwordHash) : await verifyPassword(parsed.data.password, "$2a$10$invalidhashinvalidhashinvalidhashinvalidhashinvalidha");
  if (!user || !ok) {
    return { error: "E-mail ou mot de passe incorrect.", values };
  }
  if (!user.isActive) {
    return { error: "Ce compte est désactivé. Contactez l'administrateur.", values };
  }

  resetRateLimit(key);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession(user);
  redirect(safeNext(formData.get("next"), homeForRole(user.role as Role)));
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

/** Redirige l'utilisateur connecté vers son espace (utilisé par /login et /register). */
export async function redirectIfAuthenticated() {
  const user = await getCurrentUser();
  if (user) redirect(homeForRole(user.role));
}
