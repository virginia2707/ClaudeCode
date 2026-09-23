import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MissionCreateForm } from "@/components/trainer/mission-create-form";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/current-user";
import { missionQuota } from "@/lib/data/missions";
import type { Plan } from "@/lib/constants";

export const metadata: Metadata = { title: "Nouvelle mission" };

export default async function NewMissionPage() {
  const { user, membership } = await requirePermission("mission:create");
  const plan = membership.organization.plan as Plan;
  const quota = await missionQuota({ organizationId: membership.organizationId, userId: user.id }, plan);
  if (quota.reached) redirect("/app/trainer/missions?quota=reached");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="eyebrow">Nouvelle mission</p>
        <h1 className="h1 mt-2">Décrivez la situation professionnelle.</h1>
        <p className="lead mt-3">
          L&apos;apprenant ne doit pas avoir l&apos;impression de suivre un cours, mais d&apos;être placé dans une situation réelle à résoudre.
        </p>
      </div>

      <Alert tone="info">
        Vous créez ici la fiche de la mission. Le briefing immersif, le rôle attribué, les contraintes et les étapes se complètent juste après, sur la page de la mission.
      </Alert>

      <Card className="p-6">
        <MissionCreateForm />
      </Card>

      {quota.limit !== null && (
        <p className="text-center text-xs text-text-muted">
          Plan {plan} : <span className="mono-num">{quota.used}</span> mission{quota.used > 1 ? "s" : ""} sur <span className="mono-num">{quota.limit}</span>.{" "}
          <ButtonLink href="/app/trainer/missions" variant="ghost" size="sm">
            Voir mes missions
          </ButtonLink>
        </p>
      )}
    </div>
  );
}
