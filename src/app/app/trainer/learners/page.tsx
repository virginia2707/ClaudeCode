import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requirePermission } from "@/lib/auth/current-user";
import { can } from "@/lib/authz/permissions";
import { listLearners } from "@/lib/data/learners";

export const metadata: Metadata = { title: "Apprenants" };

const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });

export default async function LearnersPage({ searchParams }: PageProps<"/app/trainer/learners">) {
  const { user, membership, role } = await requirePermission("progress:read_all");
  const sp = await searchParams;
  const search = (typeof sp.q === "string" ? sp.q : "").trim().slice(0, 100);
  const learners = await listLearners({ organizationId: membership.organizationId, userId: user.id }, search);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="h1">Apprenants</h1>
          <p className="mt-2 text-text-secondary">Les apprenants de {membership.organization.name} et leur activité sur vos missions.</p>
        </div>
        {can(role, "org:manage_members") && (
          <ButtonLink href="/app/admin" variant="secondary">
            Inviter des apprenants
          </ButtonLink>
        )}
      </div>

      <Card className="p-4">
        <form role="search" method="get" className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="learner-search" className="label">
              Rechercher
            </label>
            <input id="learner-search" name="q" type="search" className="input" placeholder="Nom ou email…" defaultValue={search} />
          </div>
          <button type="submit" className="btn btn-secondary btn-md">
            Rechercher
          </button>
        </form>
      </Card>

      {learners.length === 0 ? (
        <EmptyState
          icon="users"
          title={search ? "Aucun apprenant ne correspond." : "Aucun apprenant dans cette organisation."}
          description={
            search
              ? "Essayez un autre nom ou une autre adresse email."
              : "Invitez vos apprenants depuis l'écran Organisation : ils recevront un lien pour créer leur compte."
          }
          action={
            !search && can(role, "org:manage_members") ? <ButtonLink href="/app/admin">Inviter un apprenant</ButtonLink> : undefined
          }
        />
      ) : (
        <Card className="p-2">
          <ul className="divide-y divide-border">
            {learners.map((l) => (
              <li key={l.membershipId} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{l.user.name}</p>
                    {l.status === "DISABLED" && <Badge tone="danger">désactivé</Badge>}
                  </div>
                  <p className="text-xs text-text-muted">
                    {l.user.email} · {l.user.lastLoginAt ? `dernière connexion ${dateFmt.format(l.user.lastLoginAt)}` : "jamais connecté"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge tone={l.inProgress > 0 ? "accent" : "neutral"}>
                    <span className="mono-num">{l.inProgress}</span> en cours
                  </Badge>
                  <Badge tone={l.completed > 0 ? "success" : "neutral"}>
                    <span className="mono-num">{l.completed}</span> terminée{l.completed > 1 ? "s" : ""}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
