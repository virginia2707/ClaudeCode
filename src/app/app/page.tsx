import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Stat } from "@/components/ui/stat";
import { guardPage } from "@/lib/auth/guards";
import { IconArrowRight, IconLayers, IconPlay } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Tableau de bord" };

export default async function TrainerHome() {
  const user = await guardPage(["TRAINER", "ADMIN"], "/app");
  return (
    <>
      <PageHeader
        eyebrow="Espace formateur"
        title={`Bonjour ${user.firstName}`}
        description="Créez une mission, lancez une session et suivez les compétences de vos apprenants."
        actions={
          <ButtonLink href="/app/games/new">
            Créer un Escape Game <IconArrowRight size={16} />
          </ButtonLink>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Escape Games" value={0} hint="brouillons et publiés" />
        <Stat label="Sessions" value={0} hint="lancées ce mois-ci" />
        <Stat label="Participants" value={0} hint="toutes sessions" />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card glow>
          <IconLayers size={22} className="text-accent" />
          <h2 className="mt-3 font-semibold text-lg">Votre premier Escape Game</h2>
          <p className="mt-1.5 text-sm text-text-muted">
            Partez d&apos;un cours existant : un objectif, quelques compétences, un scénario. Le Step Builder vous guide étape par étape.
          </p>
          <ButtonLink href="/app/games/new" className="mt-4" variant="secondary">
            Commencer
          </ButtonLink>
        </Card>
        <Card>
          <IconPlay size={22} className="text-accent" />
          <h2 className="mt-3 font-semibold text-lg">Démo « Mission Excel — Le reporting disparu »</h2>
          <p className="mt-1.5 text-sm text-text-muted">
            Un escape game complet de 30 minutes, prêt à être lancé et dupliqué. Disponible dès la phase 18 du développement.
          </p>
          <ButtonLink href="/demo" className="mt-4" variant="secondary">
            Voir la présentation
          </ButtonLink>
        </Card>
      </div>
    </>
  );
}
