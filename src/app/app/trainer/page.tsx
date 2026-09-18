import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { requirePermission } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Tableau de bord formateur" };

export default async function TrainerDashboard() {
  const { user, membership } = await requirePermission("mission:create");
  const [missions, published, sessions, learners] = await Promise.all([
    prisma.mission.count({ where: { organizationId: membership.organizationId } }),
    prisma.mission.count({ where: { organizationId: membership.organizationId, status: "PUBLISHED" } }),
    prisma.session.count({ where: { organizationId: membership.organizationId } }),
    prisma.membership.count({ where: { organizationId: membership.organizationId, role: "LEARNER", status: "ACTIVE" } }),
  ]);
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{membership.organization.name}</p>
          <h1 className="h1 mt-2">Bonjour {user.name.split(" ")[0]}.</h1>
          <p className="mt-2 text-text-secondary">Votre espace de conception. La création de missions arrive en phase 4.</p>
        </div>
        <ButtonLink href="/app/trainer/missions" variant="secondary">
          Mes missions
        </ButtonLink>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Missions" value={String(missions)} hint={`${published} publiée${published > 1 ? "s" : ""}`} />
        <Stat label="Sessions" value={String(sessions)} />
        <Stat label="Apprenants" value={String(learners)} hint="membres actifs" />
        <Stat label="Plan" value={membership.organization.plan} />
      </div>
      <Card className="p-6">
        <h2 className="h3">Prochaines étapes</h2>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-text-secondary">
          <li>Invitez vos collègues et apprenants depuis la page Organisation.</li>
          <li>Créez votre première mission (phase 4) ou générez-la à partir d&apos;un cours (phase 16).</li>
          <li>Lancez une session et suivez les décisions et livrables (phase 14).</li>
        </ol>
      </Card>
    </div>
  );
}
