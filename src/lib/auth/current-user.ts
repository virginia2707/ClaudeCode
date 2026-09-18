import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { readActiveOrganization, readSession } from "@/lib/auth/session";
import { assertCan, can, type Permission } from "@/lib/authz/permissions";
import type { OrgRole } from "@/lib/constants";

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof loadCurrentUser>>>;

const loadCurrentUser = cache(async () => {
  const session = await readSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    include: {
      memberships: {
        where: { status: "ACTIVE" },
        include: { organization: { select: { id: true, name: true, slug: true, plan: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  return user;
});

/** Utilisateur connecté (ou null). Mis en cache par requête. */
export const getCurrentUser = loadCurrentUser;

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export type ActiveMembership = CurrentUser["memberships"][number];

/** Appartenance active : cookie d'organisation si valide, sinon la première. */
export async function getActiveMembership(user: CurrentUser): Promise<ActiveMembership | null> {
  if (user.memberships.length === 0) return null;
  const wanted = await readActiveOrganization();
  return user.memberships.find((m) => m.organizationId === wanted) ?? user.memberships[0];
}

export async function requireMembership() {
  const user = await requireUser();
  const membership = await getActiveMembership(user);
  if (!membership) redirect("/app/join");
  return { user, membership, role: membership.role as OrgRole };
}

/** Garde de page : redirige si la permission manque. */
export async function requirePermission(permission: Permission) {
  const ctx = await requireMembership();
  if (!can(ctx.role, permission)) redirect("/app");
  return ctx;
}

/** Garde de server action : lève ForbiddenError (jamais de redirect silencieux). */
export async function authorizeAction(permission: Permission) {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  const membership = await getActiveMembership(user);
  const role = (membership?.role ?? null) as OrgRole | null;
  assertCan(role, permission);
  return { user, membership: membership!, role: role as OrgRole };
}

export function homeForRole(role: OrgRole | null) {
  if (role === "LEARNER") return "/app/learn";
  if (role === "TRAINER" || role === "ADMIN") return "/app/trainer";
  return "/app/join";
}
