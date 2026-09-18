import { Flame } from "lucide-react";
import { formatPoints } from "@/lib/utils";

export function GameHeader({ index, total, score, streak, seconds }: { index: number; total: number; score: number; streak: number; seconds?: number }) {
  return (
    <div className="grid grid-cols-4 gap-2 text-center sm:grid-cols-4">
      <Stat label="Question" value={`${index + 1} / ${total}`} />
      <Stat label="Score" value={formatPoints(score)} tone="spark" />
      <Stat label="Série" value={streak >= 2 ? `🔥 x${streak}` : streak === 1 ? "x1" : "—"} tone={streak >= 2 ? "spark" : undefined} />
      <Stat label="Temps" value={seconds != null ? String(seconds) : "—"} tone={seconds != null && seconds <= 5 ? "danger" : undefined} />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "spark" | "danger" }) {
  return (
    <div className="card-2 px-2 py-2">
      <div className="text-[0.65rem] font-semibold uppercase tracking-wider text-text-faint">{label}</div>
      <div className={`text-lg font-bold tabular-nums ${tone === "spark" ? "text-spark" : tone === "danger" ? "text-danger" : ""}`}>{value}</div>
    </div>
  );
}
