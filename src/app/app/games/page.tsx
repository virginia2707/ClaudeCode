import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { ButtonLink } from "@/components/ui/button";
import { GameCard } from "@/components/app/game-card";
import { EmptyState } from "@/components/app/empty-state";
import { Alert } from "@/components/ui/alert";
import { guardPage } from "@/lib/auth/guards";
import { countGamesByStatus, listGamesForOwner } from "@/lib/games/queries";
import { cn } from "@/lib/cn";
import { IconArrowRight, IconLayers } from "@/components/ui/icons";
import type { GameStatus } from "@/lib/constants";

export const metadata: Metadata = { title: "Mes Escape Games" };

const tabs: { key: GameStatus | "ALL"; label: string }[] = [
  { key: "ALL", label: "Tous" },
  { key: "DRAFT", label: "Brouillons" },
  { key: "PUBLISHED", label: "Publiés" },
  { key: "ARCHIVED", label: "Archivés" },
];

export default async function GamesPage(props: PageProps<"/app/games">) {
  const user = await guardPage(["TRAINER", "ADMIN"], "/app/games");
  const sp = await props.searchParams;
  const status = (tabs.some((t) => t.key === sp.status) ? sp.status : "ALL") as GameStatus | "ALL";
  const [games, counts] = await Promise.all([listGamesForOwner(user.id, status), countGamesByStatus(user.id)]);
  return (
    <>
      <PageHeader
        title="Mes Escape Games"
        description="Créez, modifiez, dupliquez et publiez vos missions."
        actions={
          <ButtonLink href="/app/games/new">
            Créer un Escape Game <IconArrowRight size={16} />
          </ButtonLink>
        }
      />
      {sp.deleted ? <Alert tone="success" className="mb-4">Escape Game supprimé.</Alert> : null}
      <nav aria-label="Filtrer par statut" className="mb-5 overflow-x-auto">
        <ul className="flex gap-1 border-b border-border">
          {tabs.map((t) => (
            <li key={t.key}>
              <Link
                href={t.key === "ALL" ? "/app/games" : `/app/games?status=${t.key}`}
                aria-current={status === t.key ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap",
                  status === t.key ? "border-accent text-accent" : "border-transparent text-text-muted hover:text-text",
                )}
              >
                {t.label}
                <span className="pill !py-0 !px-1.5 text-[11px]">{counts[t.key] ?? 0}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {games.length === 0 ? (
        <EmptyState
          icon={<IconLayers size={22} />}
          title={status === "ALL" ? "Aucun Escape Game pour le moment" : "Aucun Escape Game dans cette catégorie"}
          description="Transformez un cours en mission : un scénario, des étapes, des énigmes, des codes."
          action={
            <ButtonLink href="/app/games/new">
              Créer mon premier Escape Game <IconArrowRight size={16} />
            </ButtonLink>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {games.map((g) => (
            <GameCard key={g.id} game={g} />
          ))}
        </div>
      )}
    </>
  );
}
