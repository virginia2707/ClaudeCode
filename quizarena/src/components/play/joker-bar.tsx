"use client";

import { Scissors, Zap, Clock, RotateCcw } from "lucide-react";
import { JOKER_LABELS, JOKER_TYPES, type JokerType } from "@/lib/constants";
import { cn } from "@/lib/utils";

const ICONS: Record<JokerType, typeof Zap> = { FIFTY_FIFTY: Scissors, DOUBLE_POINTS: Zap, EXTRA_TIME: Clock, SECOND_CHANCE: RotateCcw };

export function JokerBar({
  jokers,
  usedOnCurrent,
  disabled,
  pending,
  onUse,
}: {
  jokers: { type: string; remaining: number }[];
  usedOnCurrent: Set<string>;
  disabled: boolean;
  pending: string | null;
  onUse: (type: JokerType) => void;
}) {
  const byType = new Map(jokers.map((j) => [j.type, j.remaining]));
  const visible = JOKER_TYPES.filter((t) => byType.has(t));
  if (visible.length === 0) return null;
  return (
    <div className="card p-3" role="group" aria-label="Jokers">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-faint">Jokers</div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {visible.map((type) => {
          const remaining = byType.get(type) ?? 0;
          const active = usedOnCurrent.has(type);
          const Icon = ICONS[type];
          const isDisabled = disabled || remaining <= 0 || active || pending !== null;
          return (
            <button
              key={type}
              type="button"
              onClick={() => onUse(type)}
              disabled={isDisabled}
              aria-pressed={active}
              title={JOKER_LABELS[type].description}
              className={cn(
                "card-2 flex min-h-14 flex-col items-center justify-center gap-0.5 px-2 py-2 text-xs font-semibold transition",
                active && "border-spark bg-spark-soft text-spark",
                !active && !isDisabled && "hover:border-border-strong",
                isDisabled && !active && "opacity-50",
              )}
            >
              <span className="flex items-center gap-1">
                <Icon className="size-4" aria-hidden="true" />
                {JOKER_LABELS[type].name}
              </span>
              <span className="text-[0.65rem] text-text-muted">{active ? "Actif" : `× ${remaining}`}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
