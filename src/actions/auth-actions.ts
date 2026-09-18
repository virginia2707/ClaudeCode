"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession, setActiveOrganization } from "@/lib/auth/session";
import { getCurrentUser, homeForRole, requireUser } from "@/lib/auth/current-user";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/auth/rate-limit";
import { slugify } from "@/lib/auth/slug";
import { shortCode } from "@/lib/auth/tokens";
import { logAudit } from "@/lib/audit";
import {
  createOrganizationSchema,
  fieldErrorsFrom,
  loginSchema,
  registerSchema,
  safeNext,
  type FormState,
} from "@/lib/auth/schemas";
import type { OrgRole } from "@/lib/constants";

function formValues(formData: FormData, keys: string[]) {
  const values: Record<string, string> = {};
  for (const k of keys) values[k] = String(formData.get(k) ?? "");
  return values;
}

async function uniqueSlug(base: string) {
  const root = slugify(base);
  let slug = root;
  for (let i = 0; i < 20; i++) {
    const exists = await prisma.organization.findUnique({ where: { slug }, select: { id: true } });
    if (!exists) return slug;
    slug = `${root}-${shortCode(4).toLowerCase()}`;
  }
  return `${root}-${Date.now().toString(36)}`;
}

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["name", "email", "accountType", "organizationName", "inviteToken"]);
  const limited = await enforceRateLimit(RATE_LIMITS.register);
  if (limited) return { error: limited, values };

  const parsed = registerSchema.safeParse({ ...values, password: formData.get("password") });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };
  const data = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: data.email }, select: { id: true } });
  if (existing) return { fieldErrors: { email: "Un compte existe déjà avec cette adresse. Connectez-vous." }, values };

  // Invitation éventuelle (apprenant ou membre invité par un admin)
  const invitation = data.inviteToken
    ? await prisma.invitation.findUnique({ where: { token: data.inviteToken }, include: { organization: true } })
    : null;
  if (data.inviteToken && (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date())) {
    return { error: "Cette invitation est invalide ou expirée.", values };
  }
  if (invitation && invitation.email !== data.email) {
    return { fieldErrors: { email: `Cette invitation est destinée à ${invitation.email}.` }, values };
  }

  const passwordHash = await hashPassword(data.password);

  const { user, role, organizationId } = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { name: data.name, email: data.email, passwordHash } });
    let role: OrgRole | null = null;
    let organizationId: string | null = null;

    if (invitation) {
      await tx.membership.create({ data: { userId: user.id, organizationId: invitation.organizationId, role: invitation.role } });
      await tx.invitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date() } });
      role = invitation.role as OrgRole;
      organizationId = invitation.organizationId;
    } else if (data.accountType === "TRAINER") {
      const org = await tx.organization.create({
        data: { name: data.organizationName!, slug: await uniqueSlug(data.organizationName!) },
      });
      await tx.membership.create({ data: { userId: user.id, organizationId: org.id, role: "ADMIN" } });
      role = "ADMIN";
      organizationId = org.id;
    }
    return { user, role, organizationId };
  });

  await logAudit({ organizationId, userId: user.id, action: "user.register", targetType: "User", targetId: user.id, meta: { accountType: data.accountType, invited: !!invitation } });
  await createSession(user.id);
  if (organizationId) await setActiveOrganization(organizationId);
  redirect(homeForRole(role));
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["email", "next"]);
  const parsed = loginSchema.safeParse({ ...values, password: formData.get("password") });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };

  const limited = await enforceRateLimit(RATE_LIMITS.login, parsed.data.email);
  if (limited) return { error: limited, values };

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    include: { memberships: { where: { status: "ACTIVE" }, orderBy: { createdAt: "asc" }, take: 1 } },
  });
  // Message identique que l'email existe ou non (pas d'énumération de comptes).
  const invalid: FormState = { error: "Email ou mot de passe incorrect.", values };
  if (!user) return invalid;
  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) return invalid;

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession(user.id);
  const first = user.memberships[0];
  if (first) await setActiveOrganization(first.organizationId);
  redirect(safeNext(parsed.data.next, homeForRole((first?.role as OrgRole) ?? null)));
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function createOrganizationAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = createOrganizationSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const org = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({ data: { name: parsed.data.name, slug: await uniqueSlug(parsed.data.name) } });
    await tx.membership.create({ data: { userId: user.id, organizationId: org.id, role: "ADMIN" } });
    return org;
  });
  await logAudit({ organizationId: org.id, userId: user.id, action: "organization.create", targetType: "Organization", targetId: org.id });
  await setActiveOrganization(org.id);
  redirect("/app/trainer");
}

export async function switchOrganizationAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const organizationId = String(formData.get("organizationId") ?? "");
  const membership = user.memberships.find((m) => m.organizationId === organizationId);
  if (!membership) return;
  await setActiveOrganization(organizationId);
  redirect(homeForRole(membership.role as OrgRole));
}
