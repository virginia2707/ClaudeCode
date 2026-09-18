import type { PlayerView, TeamView } from "@/lib/realtime/events";
import { cn, formatPoints } from "@/lib/utils";
import { levelFor } from "@/lib/game/levels";

export function Leaderboard({ players, highlightId, limit = 10, showLevel = true, compact }: { players: PlayerView[]; highlightId?: string; limit?: number; showLevel?: boolean; compact?: boolean }) {
  const shown = players.slice(0, limit);
  const me = highlightId ? players.find((p) => p.id === highlightId) : null;
  const meHidden = me && !shown.some((p) => p.id === me.id);
  return (
    <ol className="space-y-1.5" aria-label="Classement">
      {shown.map((p) => (
        <Row key={p.id} p={p} highlight={p.id === highlightId} showLevel={showLevel} compact={compact} />
      ))}
      {meHidden && me ? (
        <>
          <li className="px-2 text-center text-xs text-text-faint" aria-hidden="true">
            …
          </li>
          <Row p={me} highlight showLevel={showLevel} compact={compact} />
        </>
      ) : null}
    </ol>
  );
}

function Row({ p, highlight, showLevel, compact }: { p: PlayerView; highlight: boolean; showLevel: boolean; compact?: boolean }) {
  const delta = p.previousRank != null ? p.previousRank - p.rank : 0;
  const level = levelFor(p.score);
  return (
    <li
      className={cn("card-2 flex items-center gap-3 px-3 py-2 anim-fade-up", highlight && "border-primary bg-primary-soft", compact && "py-1.5")}
      aria-current={highlight ? "true" : undefined}
    >
      <span className={cn("w-7 text-center text-sm font-black tabular-nums", p.rank === 1 ? "text-spark" : "text-text-muted")}>{p.rank}</span>
      <span className="min-w-0 flex-1 truncate font-medium">
        {p.nickname}
        {p.teamName ? <span className="ml-1 text-xs text-text-faint">· {p.teamName}</span> : null}
        {!p.connected ? <span className="sr-only"> (déconnecté)</span> : null}
      </span>
      {p.streak >= 2 ? <span className="pill pill-spark">🔥 x{p.streak}</span> : null}
      {showLevel && !compact ? <span className="pill hidden sm:inline-flex">{level.name}</span> : null}
      <span className="w-20 text-right font-semibold tabular-nums">{formatPoints(p.score)}</span>
      <span className={cn("w-10 text-right text-xs tabular-nums", delta > 0 ? "text-success" : delta < 0 ? "text-danger" : "text-text-faint")} aria-label={delta > 0 ? `plus ${delta} positions` : delta < 0 ? `moins ${-delta} positions` : "position stable"}>
        {delta > 0 ? `↑${delta}` : delta < 0 ? `↓${-delta}` : "–"}
      </span>
    </li>
  );
}

export function TeamLeaderboard({ teams, highlightId }: { teams: TeamView[]; highlightId?: string | null }) {
  return (
    <ol className="space-y-1.5" aria-label="Classement des équipes">
      {teams.map((t) => (
        <li key={t.id} className={cn("card-2 flex items-center gap-3 px-3 py-2", t.id === highlightId && "border-primary bg-primary-soft")}>
          <span className="w-7 text-center text-sm font-black tabular-nums text-text-muted">{t.rank}</span>
          <span className="size-3 rounded-full" style={{ background: t.color }} aria-hidden="true" />
          <span className="flex-1 truncate font-medium">{t.name}</span>
          <span className="font-semibold tabular-nums">{formatPoints(t.score)}</span>
        </li>
      ))}
    </ol>
  );
}
