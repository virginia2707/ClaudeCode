import { cn } from "@/lib/utils/cn";

type ProgressBarProps = {
  value: number; // 0..100
  label: string; // libellé accessible
  showValue?: boolean;
  className?: string;
};

export function ProgressBar({ value, label, showValue = true, className }: ProgressBarProps) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className="track flex-1"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={v}
      >
        <div className="track-fill" style={{ width: `${v}%` }} />
      </div>
      {showValue && <span className="mono-num text-sm text-text-secondary w-11 text-right">{v} %</span>}
    </div>
  );
}

export type SkillState = "acquired" | "in_progress" | "pending";

const SKILL_GLYPH: Record<SkillState, { glyph: string; label: string; className: string }> = {
  acquired: { glyph: "✓", label: "acquise", className: "text-success" },
  in_progress: { glyph: "●", label: "en cours", className: "text-accent" },
  pending: { glyph: "○", label: "à venir", className: "text-text-muted" },
};

export function SkillList({ skills, className }: { skills: ReadonlyArray<{ name: string; state: SkillState }>; className?: string }) {
  return (
    <ul className={cn("space-y-1.5", className)}>
      {skills.map((s) => {
        const g = SKILL_GLYPH[s.state];
        return (
          <li key={s.name} className="flex items-center gap-2.5 text-sm">
            <span aria-hidden="true" className={cn("mono-num w-4 text-center", g.className)}>
              {g.glyph}
            </span>
            <span className={s.state === "pending" ? "text-text-muted" : "text-text"}>{s.name}</span>
            <span className="sr-only">, {g.label}</span>
          </li>
        );
      })}
    </ul>
  );
}
