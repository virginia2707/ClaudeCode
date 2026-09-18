"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { authorizeAction, getCurrentUser, homeForRole } from "@/lib/auth/current-user";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/auth/rate-limit";
import { setActiveOrganization } from "@/lib/auth/session";
import { randomToken } from "@/lib/auth/tokens";
import { logAudit } from "@/lib/audit";
import { fieldErrorsFrom, inviteSchema, memberRoleSchema, memberStatusSchema, type FormState } from "@/lib/auth/schemas";
import { ForbiddenError } from "@/lib/authz/permissions";
import type { OrgRole } from "@/lib/constants";

const INVITATION_DAYS = 14;
const ADMIN_PAGE = "/app/admin";

function handleActionError(e: unknown): FormState {
  if (e instanceof ForbiddenError) return { error: "Vous n'avez pas les droits pour cette action." };
  if (e instanceof Error && e.message === "UNAUTHENTICATED") return { error: "Session expirée. Reconnectez-vous." };
  throw e;
}

export async function inviteMemberAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const { user, membership, role } = await authorizeAction("org:manage_members");
    const limited = await enforceRateLimit(RATE_LIMITS.invite, user.id);
    if (limited) return { error: limited };

    const parsed = inviteSchema.safeParse({ email: formData.get("email"), role: formData.get("role") });
    if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };
    // Un TRAINER ne peut pas créer d'ADMIN (seul un ADMIN peut ; ici org:manage_members ⇒ ADMIN, garde défensive).
    if (parsed.data.role === "ADMIN" && role !== "ADMIN") return { error: "Seul un administrateur peut inviter un administrateur." };

    const already = await prisma.membership.findFirst({
      where: { organizationId: membership.organizationId, user: { email: parsed.data.email } },
      select: { id: true },
    });
    if (already) return { fieldErrors: { email: "Cette personne est déjà membre de l'organisation." } };

    const token = randomToken();
    const invitation = await prisma.invitation.create({
      data: {
        organizationId: membership.organizationId,
        email: parsed.data.email,
        role: parsed.data.role,
        token,
        invitedById: user.id,
        expiresAt: new Date(Date.now() + INVITATION_DAYS * 86400_000),
      },
    });
    await logAudit({ organizationId: membership.organizationId, userId: user.id, action: "member.invite", targetType: "Invitation", targetId: invitation.id, meta: { email: parsed.data.email, role: parsed.data.role } });
    revalidatePath(ADMIN_PAGE);
    return { success: `Invitation créée pour ${parsed.data.email}. Partagez le lien ci-dessous.` };
  } catch (e) {
    return handleActionError(e);
  }
}

export async function revokeInvitationAction(formData: FormData) {
  const { user, membership } = await authorizeAction("org:manage_members");
  const id = String(formData.get("invitationId") ?? "");
  const inv = await prisma.invitation.findFirst({ where: { id, organizationId: membership.organizationId, acceptedAt: null } });
  if (!inv) return;
  await prisma.invitation.delete({ where: { id } });
  await logAudit({ organizationId: membership.organizationId, userId: user.id, action: "member.invite_revoke", targetType: "Invitation", targetId: id, meta: { email: inv.email } });
  revalidatePath(ADMIN_PAGE);
}

export async function updateMemberRoleAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const { user, membership } = await authorizeAction("org:manage_members");
    const parsed = memberRoleSchema.safeParse({ membershipId: formData.get("membershipId"), role: formData.get("role") });
    if (!parsed.success) return { error: "Données invalides." };

    const target = await prisma.membership.findFirst({ where: { id: parsed.data.membershipId, organizationId: membership.organizationId } });
    if (!target) return { error: "Membre introuvable dans cette organisation." };
    if (target.userId === user.id && parsed.data.role !== "ADMIN") {
      const otherAdmins = await prisma.membership.count({ where: { organizationId: membership.organizationId, role: "ADMIN", status: "ACTIVE", NOT: { id: target.id } } });
      if (otherAdmins === 0) return { error: "Impossible : vous êtes le dernier administrateur de l'organisation." };
    }
    await prisma.membership.update({ where: { id: target.id }, data: { role: parsed.data.role } });
    await logAudit({ organizationId: membership.organizationId, userId: user.id, action: "member.role_change", targetType: "Membership", targetId: target.id, meta: { from: target.role, to: parsed.data.role } });
    revalidatePath(ADMIN_PAGE);
    return { success: "Rôle mis à jour." };
  } catch (e) {
    return handleActionError(e);
  }
}

export async function setMemberStatusAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const { user, membership } = await authorizeAction("org:manage_members");
    const parsed = memberStatusSchema.safeParse({ membershipId: formData.get("membershipId"), status: formData.get("status") });
    if (!parsed.success) return { error: "Données invalides." };
    const target = await prisma.membership.findFirst({ where: { id: parsed.data.membershipId, organizationId: membership.organizationId } });
    if (!target) return { error: "Membre introuvable." };
    if (target.userId === user.id) return { error: "Vous ne pouvez pas désactiver votre propre compte." };
    await prisma.membership.update({ where: { id: target.id }, data: { status: parsed.data.status } });
    await logAudit({ organizationId: membership.organizationId, userId: user.id, action: parsed.data.status === "DISABLED" ? "member.disable" : "member.enable", targetType: "Membership", targetId: target.id });
    revalidatePath(ADMIN_PAGE);
    return { success: parsed.data.status === "DISABLED" ? "Membre désactivé." : "Membre réactivé." };
  } catch (e) {
    return handleActionError(e);
  }
}

/** Acceptation d'une invitation par un utilisateur déjà connecté (même email). */
export async function acceptInvitationAction(formData: FormData) {
  const user = await getCurrentUser();
  const token = String(formData.get("token") ?? "");
  if (!user) redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);

  const invitation = await prisma.invitation.findUnique({ where: { token } });
  if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) redirect(`/invite/${token}?error=invalid`);
  if (invitation.email !== user.email) redirect(`/invite/${token}?error=email`);

  await prisma.$transaction(async (tx) => {
    await tx.membership.upsert({
      where: { userId_organizationId: { userId: user.id, organizationId: invitation.organizationId } },
      create: { userId: user.id, organizationId: invitation.organizationId, role: invitation.role },
      update: { role: invitation.role, status: "ACTIVE" },
    });
    await tx.invitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date() } });
  });
  await logAudit({ organizationId: invitation.organizationId, userId: user.id, action: "member.invite_accept", targetType: "Invitation", targetId: invitation.id });
  await setActiveOrganization(invitation.organizationId);
  redirect(homeForRole(invitation.role as OrgRole));
}
