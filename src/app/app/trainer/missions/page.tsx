import type { Metadata } from "next";
import { Suspense } from "react";
import { MissionCard } from "@/components/trainer/mission-card";
import { MissionFilters } from "@/components/trainer/mission-filters";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requirePermission } from "@/lib/auth/current-user";
import { can } from "@/lib/authz/permissions";
import { parseMissionListParams } from "@/lib/data/mission-filters";
import { listMissions, missionCountsByStatus, missionQuota } from "@/lib/data/missions";
import type { Plan } from "@/lib/constants";

export const metadata: Metadata = { title: "Missions" };

export default async function MissionsPage({ searchParams }: PageProps<"/app/trainer/missions">) {
  const { user, membership, role } = await requirePermission("mission:create");
  const scope = { organizationId: membership.organizationId, userId: user.id };
  const params = parseMissionListParams(await searchParams);

  const [missions, counts, quota] = await Promise.all([
    listMissions(scope, params),
    missionCountsByStatus(scope),
    missionQuota(scope, membership.organization.plan as Plan),
  ]);

  const canCreate = can(role, "mission:create");
  const filtered = params.search !== "" || params.status !== "ALL";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="h1">Missions</h1>
          <p className="mt-2 text-text-secondary">
            Vos missions, de la conception à la publication.
            {quota.limit !== null && (
              <>
                {" "}
                <span className="mono-num">
                  {quota.used}/{quota.limit}
                </span>{" "}
                utilisées sur le plan {membership.organization.plan}.
              </>
            )}
          </p>
        </div>
        {canCreate && !quota.reached && <ButtonLink href="/app/trainer/missions/new">Nouvelle mission</ButtonLink>}
      </div>

      {quota.reached && (
        <Alert tone="warning" title="Limite de missions atteinte">
          Votre plan {membership.organization.plan} autorise {quota.limit} missions. Supprimez ou archivez une mission, ou passez à un plan supérieur pour en créer de
          nouvelles.
        </Alert>
      )}

      <Suspense fallback={null}>
        <MissionFilters params={params} counts={counts} />
      </Suspense>

      {missions.length === 0 ? (
        filtered ? (
          <EmptyState
            icon="compass"
            title="Aucune mission ne correspond à votre recherche."
            description="Essayez un autre terme, ou changez de filtre de statut."
          />
        ) : (
          <EmptyState
            title="Aucune mission pour l'instant."
            description="Créez votre première mission à partir de zéro. La génération depuis un cours existant arrive en phase 16."
            action={canCreate ? <ButtonLink href="/app/trainer/missions/new">Créer une mission</ButtonLink> : undefined}
          />
        )
      ) : (
        <ul className="space-y-3">
          {missions.map((mission) => (
            <li key={mission.id}>
              <MissionCard mission={mission} canDelete={can(role, "mission:delete")} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
