import Link from "next/link";
import { StatusPill } from "@/components/app/status-pill";
import { Pill } from "@/components/ui/pill";
import { CATEGORY_LABELS, LEVEL_LABELS, type Category, type Level } from "@/lib/constants";
import { formatDate, pluralize } from "@/lib/format";
import type { GameListItem } from "@/lib/games/queries";
import { IconClock, IconLayers, IconPlay } from "@/components/ui/icons";

export function GameCard({ game }: { game: GameListItem }) {
  return (
    <article className="card overflow-hidden flex flex-col">
      <Link href={`/app/games/${game.id}`} className="block group">
        <div className="relative h-28 bg-surface-3 grid-bg">
          {game.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={game.coverImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-text-subtle">
              <IconLayers size={28} />
            </div>
          )}
          <div className="absolute left-3 top-3 flex gap-1.5">
            <StatusPill status={game.status} />
            {game.isDemo ? <Pill tone="highlight">Démo</Pill> : null}
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-semibold leading-snug group-hover:text-accent transition-colors">{game.title}</h3>
          <p className="mt-1 text-sm text-text-muted line-clamp-2">{game.description || "Aucune description."}</p>
        </div>
      </Link>
      <div className="px-4 pb-4 mt-auto">
        <div className="flex flex-wrap gap-1.5 text-xs">
          <Pill>{CATEGORY_LABELS[game.category as Category] ?? game.category}</Pill>
          <Pill>{LEVEL_LABELS[game.level as Level] ?? game.level}</Pill>
          <Pill>
            <IconClock size={12} /> {game.estimatedMinutes} min
          </Pill>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-text-subtle">
          <span>
            {pluralize(game._count.steps, "étape")} · {pluralize(game._count.sessions, "session")}
          </span>
          <span>Modifié le {formatDate(game.updatedAt)}</span>
        </div>
        <div className="mt-3 flex gap-2">
          <Link href={`/app/games/${game.id}`} className="btn btn-secondary btn-sm flex-1">
            Ouvrir
          </Link>
          {game.status === "PUBLISHED" ? (
            <Link href={`/app/games/${game.id}/launch`} className="btn btn-primary btn-sm flex-1">
              <IconPlay size={14} /> Lancer
            </Link>
          ) : (
            <Link href={`/app/games/${game.id}/steps`} className="btn btn-ghost btn-sm flex-1">
              Étapes
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
