import { proficiencyLabel } from "@/lib/constants";

export function SkillBar({ name, score }: { name: string; score: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-text">{name}</span>
        <span className="text-text-muted">
          {score} · {proficiencyLabel(score)}
        </span>
      </div>
      <div className="track">
        <div className="track-fill" style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
      </div>
    </div>
  );
}

export function ProgressBar({ value, max, label }: { value: number; max: number; label?: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div>
      {label && (
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-text-muted">{label}</span>
          <span className="text-text-muted">
            {value} / {max}
          </span>
        </div>
      )}
      <div className="track">
        <div className="track-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
