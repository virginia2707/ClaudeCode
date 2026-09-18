import { cn } from "@/lib/utils";

export function TimerBar({ seconds, ratio, className }: { seconds: number; ratio: number; className?: string }) {
  const urgent = seconds <= 5;
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="timer-track flex-1" aria-hidden="true">
        <div className="timer-fill" data-urgent={urgent} style={{ width: `${Math.max(0, Math.min(1, ratio)) * 100}%` }} />
      </div>
      <div
        className={cn("min-w-10 text-right text-xl font-black tabular-nums", urgent ? "text-danger" : "text-text")}
        role="timer"
        aria-live={urgent ? "assertive" : "off"}
        aria-label={`${seconds} secondes restantes`}
      >
        {seconds}
      </div>
    </div>
  );
}
