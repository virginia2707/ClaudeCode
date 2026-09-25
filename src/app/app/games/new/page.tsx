import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { GameForm, defaultGameValues } from "@/components/builder/game-form";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { guardPage } from "@/lib/auth/guards";
import { canCreateGame } from "@/lib/plans-guard";

export const metadata: Metadata = { title: "Nouvel Escape Game" };

export default async function NewGamePage() {
  const user = await guardPage(["TRAINER", "ADMIN"], "/app/games/new");
  const allowed = await canCreateGame(user);
  return (
    <>
      <nav aria-label="Fil d'Ariane" className="mb-3 text-sm text-text-muted">
        <Link href="/app/games" className="hover:text-text">
          Mes Escape Games
        </Link>{" "}
        / <span className="text-text">Nouveau</span>
      </nav>
      <PageHeader
        title="Créer un Escape Game"
        description="Étape 1 sur 2 : les informations de la mission. Vous ajouterez ensuite les étapes et les énigmes."
        actions={
          <ButtonLink href="/app/games/generate" variant="secondary">
            Générer avec l&apos;IA
          </ButtonLink>
        }
      />
      {!allowed.ok ? <Alert tone="warning" className="mb-4">{allowed.error}</Alert> : null}
      <div className="max-w-3xl">
        <GameForm initial={defaultGameValues} cancelHref="/app/games" />
      </div>
    </>
  );
}
