import type { ScoreBucket } from "@/lib/game/report";

export function ScoreDistribution({ buckets }: { buckets: ScoreBucket[] }) {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  return (
    <div className="card p-5">
      <h3 className="font-semibold">Répartition des scores</h3>
      <div className="mt-4 flex items-end gap-3" role="img" aria-label={buckets.map((b) => `${b.label} points : ${b.count} joueur${b.count > 1 ? "s" : ""}`).join(", ")}>
        {buckets.map((b) => (
          <div key={b.label} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-xs font-semibold tabular-nums text-text-muted">{b.count}</span>
            <div
              className="w-full rounded-t-lg bg-[linear-gradient(180deg,var(--primary),var(--primary-soft))]"
              style={{ height: `${Math.max(4, (b.count / max) * 96)}px` }}
              aria-hidden="true"
            />
            <span className="text-[0.65rem] text-text-faint">{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
