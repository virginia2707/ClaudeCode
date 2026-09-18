import type { Metadata } from "next";
import { revokeInvitationAction } from "@/actions/org-actions";
import { CopyButton } from "@/components/app/copy-button";
import { InviteForm } from "@/components/app/invite-form";
import { MemberRowActions } from "@/components/app/member-row-actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { requirePermission } from "@/lib/auth/current-user";
import { PLAN_LIMITS, type OrgRole, type Plan } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Organisation" };

const ROLE_LABEL: Record<OrgRole, string> = { ADMIN: "Administrateur", TRAINER: "Formateur", LEARNER: "Apprenant" };
const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });

export default async function AdminPage() {
  const { user, membership, role } = await requirePermission("org:manage_members");
  const orgId = membership.organizationId;
  const [members, invitations, auditLogs] = await Promise.all([
    prisma.membership.findMany({ where: { organizationId: orgId }, include: { user: { select: { id: true, name: true, email: true, lastLoginAt: true } } }, orderBy: [{ role: "asc" }, { createdAt: "asc" }] }),
    prisma.invitation.findMany({ where: { organizationId: orgId, acceptedAt: null }, orderBy: { createdAt: "desc" } }),
    prisma.auditLog.findMany({ where: { organizationId: orgId }, include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 8 }),
  ]);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const plan = membership.organization.plan as Plan;
  const limits = PLAN_LIMITS[plan];
  const trainers = members.filter((m) => m.role !== "LEARNER" && m.status === "ACTIVE").length;

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">Organisation</p>
        <h1 className="h1 mt-2">{membership.organization.name}</h1>
        <p className="mt-2 text-text-secondary">Membres, rôles, invitations et journal des actions sensibles.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Plan" value={plan} hint={limits.missions === null ? "missions illimitées" : `${limits.missions} missions max`} />
        <Stat label="Membres actifs" value={String(members.filter((m) => m.status === "ACTIVE").length)} />
        <Stat label="Formateurs et admins" value={String(trainers)} hint={limits.trainers === null ? "illimité" : `${limits.trainers} inclus`} />
        <Stat label="Invitations en attente" value={String(invitations.length)} />
      </div>

      <Card className="p-6">
        <h2 className="h3">Inviter un membre</h2>
        <p className="mt-1 text-sm text-text-secondary">Un lien d&apos;invitation valable 14 jours est généré. L&apos;envoi d&apos;email automatique arrive avec l&apos;intégration mail ; en attendant, copiez le lien.</p>
        <div className="mt-4">
          <InviteForm canInviteAdmin={role === "ADMIN"} />
        </div>
        {invitations.length > 0 && (
          <ul className="mt-6 divide-y divide-border border-t border-border">
            {invitations.map((inv) => {
              const link = `${appUrl}/invite/${inv.token}`;
              const expired = inv.expiresAt < new Date();
              return (
                <li key={inv.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{inv.email}</p>
                    <p className="text-xs text-text-muted">
                      {ROLE_LABEL[inv.role as OrgRole]} · {expired ? "expirée" : `expire le ${dateFmt.format(inv.expiresAt)}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input readOnly value={link} aria-label={`Lien d'invitation pour ${inv.email}`} className="input !min-h-9 !w-64 !py-1 text-xs" />
                    <CopyButton value={link} />
                    <form action={revokeInvitationAction}>
                      <input type="hidden" name="invitationId" value={inv.id} />
                      <button type="submit" className="btn btn-ghost btn-sm">
                        Révoquer
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="h3">Membres</h2>
        <ul className="mt-4 divide-y divide-border">
          {members.map((m) => (
            <li key={m.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{m.user.name}</p>
                  <Badge tone={m.role === "ADMIN" ? "accent" : m.role === "TRAINER" ? "info" : "neutral"}>{ROLE_LABEL[m.role as OrgRole]}</Badge>
                  {m.status === "DISABLED" && <Badge tone="danger">désactivé</Badge>}
                  {m.userId === user.id && <Badge>vous</Badge>}
                </div>
                <p className="text-xs text-text-muted">
                  {m.user.email} · {m.user.lastLoginAt ? `dernière connexion ${dateFmt.format(m.user.lastLoginAt)}` : "jamais connecté"}
                </p>
              </div>
              <MemberRowActions membershipId={m.id} role={m.role as OrgRole} status={m.status} isSelf={m.userId === user.id} name={m.user.name} />
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-6">
        <h2 className="h3">Journal d&apos;audit</h2>
        {auditLogs.length === 0 ? (
          <p className="mt-2 text-sm text-text-muted">Aucune action enregistrée.</p>
        ) : (
          <ul className="mt-3 space-y-1.5 text-sm">
            {auditLogs.map((l) => (
              <li key={l.id} className="flex flex-wrap justify-between gap-2 text-text-secondary">
                <span>
                  <span className="mono-num text-xs text-accent">{l.action}</span> · {l.user?.name ?? "système"}
                </span>
                <span className="mono-num text-xs text-text-muted">{new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(l.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
