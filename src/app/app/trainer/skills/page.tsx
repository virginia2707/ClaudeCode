import type { Metadata } from "next";
import { GlobalSkillList, SkillCreateForm, SkillList } from "@/components/trainer/skill-manager";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requirePermission } from "@/lib/auth/current-user";
import { listSkills } from "@/lib/data/skills";

export const metadata: Metadata = { title: "Compétences" };

export default async function SkillsPage() {
  const { user, membership } = await requirePermission("skill:manage");
  const { own, global } = await listSkills({ organizationId: membership.organizationId, userId: user.id });
  const ownSlugs = new Set(own.map((s) => s.slug));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="h1">Compétences</h1>
        <p className="mt-2 text-text-secondary">
          Le référentiel de votre organisation. Chaque mission et chaque étape déclarent les compétences qu&apos;elles mobilisent ; le bilan de l&apos;apprenant s&apos;appuie
          dessus.
        </p>
      </div>

      <Card className="p-6">
        <h2 className="h3">Ajouter une compétence</h2>
        <div className="mt-4">
          <SkillCreateForm />
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="h3">
          Référentiel de {membership.organization.name} <span className="mono-num text-sm text-text-muted">({own.length})</span>
        </h2>
        {own.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon="target"
              title="Aucune compétence dans votre référentiel."
              description="Ajoutez-en une ci-dessus, ou importez-en depuis la bibliothèque MissionIA."
            />
          </div>
        ) : (
          <div className="mt-2">
            <SkillList
              skills={own.map((s) => ({
                id: s.id,
                name: s.name,
                description: s.description,
                category: s.category,
                usedBy: s._count.missionSkills,
              }))}
            />
          </div>
        )}
      </Card>

      {global.length > 0 && (
        <Card className="p-6">
          <h2 className="h3">Bibliothèque MissionIA</h2>
          <p className="mt-1 text-sm text-text-secondary">Compétences transverses prêtes à l&apos;emploi. Les ajouter en crée une copie modifiable dans votre référentiel.</p>
          <div className="mt-4">
            <GlobalSkillList
              skills={global.map((s) => ({
                id: s.id,
                name: s.name,
                description: s.description,
                category: s.category,
                imported: ownSlugs.has(s.slug),
              }))}
            />
          </div>
        </Card>
      )}
    </div>
  );
}
