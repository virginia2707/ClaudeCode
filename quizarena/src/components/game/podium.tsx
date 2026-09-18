import { Award } from "lucide-react";
import type { ResultView } from "@/lib/realtime/events";
import { cn, formatPoints, formatPercent, formatSeconds } from "@/lib/utils";

const MEDALS = ["🥇", "🥈", "🥉"] as const;
const PLACE_LABEL = ["Première place", "Deuxième place", "Troisième place"] as const;

export function Podium({ results, highlightId }: { results: ResultView[]; highlightId?: string }) {
  const top = results.slice(0, 3);
  // Visual order: 2nd, 1st, 3rd (classic podium), but DOM/read order stays 1, 2, 3.
  const order = top.length >= 3 ? [top[1], top[0], top[2]] : top.length === 2 ? [top[1], top[0]] : top;
  const heights = ["h-32 sm:h-44", "h-24 sm:h-32", "h-20 sm:h-24"]; // 1st, 2nd, 3rd
  return (
    <section aria-labelledby="podium-title" className="card relative overflow-hidden p-6 sm:p-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(40rem_16rem_at_50%_-30%,rgba(255,181,71,0.22),transparent)]" />
      <div className="relative text-center">
        <div className="text-xs font-bold uppercase tracking-[0.3em] text-primary-strong">Final results</div>
        <h2 id="podium-title" className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
          Podium
        </h2>
      </div>
      <ol className="sr-only">
        {top.map((r, i) => (
          <li key={r.playerId}>
            {PLACE_LABEL[i]} : {r.nickname}, {formatPoints(r.score)} points
          </li>
        ))}
      </ol>
      <div className={cn("relative mt-8 grid items-end gap-3", order.length === 3 ? "grid-cols-3" : order.length === 2 ? "grid-cols-2" : "grid-cols-1")} aria-hidden="true">
        {order.map((r) => {
          const place = r.rank - 1;
          const isMe = r.playerId === highlightId;
          return (
            <div key={r.playerId} className={cn("text-center", place === 0 && "anim-pop", place === 1 && "anim-pop anim-delay-1", place === 2 && "anim-pop anim-delay-2")}>
              <div className="text-4xl sm:text-5xl">{MEDALS[place] ?? ""}</div>
              <div className={cn("mt-1 truncate px-1 font-bold", isMe && "text-primary-strong")}>{r.nickname}</div>
              {r.teamName ? <div className="text-xs text-text-faint">{r.teamName}</div> : null}
              <div className="text-sm tabular-nums text-spark">{formatPoints(r.score)} XP</div>
              <div className={cn("anim-rise mt-2 rounded-t-xl border border-b-0 border-border bg-[linear-gradient(180deg,var(--primary-soft),transparent)]", heights[place] ?? heights[2])} />
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function ResultCard({ r, title }: { r: ResultView; title?: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">{title ?? r.nickname}</h3>
        <span className="pill pill-primary">
          Niveau {r.level} — {r.levelName}
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
        <Stat k="Rang" v={`${r.rank}`} />
        <Stat k="Score" v={formatPoints(r.score)} />
        <Stat k="Bonnes réponses" v={`${r.correctCount} / ${r.answeredCount}`} />
        <Stat k="Précision" v={formatPercent(r.accuracy)} />
        <Stat k="Temps moyen" v={formatSeconds(r.avgResponseMs)} />
        <Stat k="Meilleure série" v={r.bestStreak >= 2 ? `🔥 x${r.bestStreak}` : `${r.bestStreak}`} />
        <Stat k="XP gagnés" v={`+${formatPoints(r.xpEarned)}`} />
      </dl>
      {r.badges.length ? (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Badges débloqués">
          {r.badges.map((b) => (
            <li key={b.code} className="pill pill-spark">
              <Award className="size-3" aria-hidden="true" /> {b.name}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-xs text-text-faint">{k}</dt>
      <dd className="font-semibold tabular-nums">{v}</dd>
    </div>
  );
}

export function ResultsTable({ results, highlightId, from = 3 }: { results: ResultView[]; highlightId?: string; from?: number }) {
  const rest = results.slice(from);
  if (!rest.length) return null;
  return (
    <ol className="space-y-1.5" aria-label="Classement final (suite)">
      {rest.map((r) => (
        <li key={r.playerId} className={cn("card-2 flex items-center gap-3 px-3 py-2", r.playerId === highlightId && "border-primary bg-primary-soft")}>
          <span className="w-7 text-center text-sm font-black tabular-nums text-text-muted">{r.rank}</span>
          <span className="min-w-0 flex-1 truncate font-medium">
            {r.nickname}
            {r.teamName ? <span className="ml-1 text-xs text-text-faint">· {r.teamName}</span> : null}
          </span>
          <span className="hidden text-xs text-text-muted sm:inline">{formatPercent(r.accuracy)}</span>
          <span className="w-20 text-right font-semibold tabular-nums">{formatPoints(r.score)}</span>
        </li>
      ))}
    </ol>
  );
}
