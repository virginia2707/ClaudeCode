"use client";

import { useEffect, useState } from "react";
import { formatDuration } from "@/lib/format";
import { IconClock } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/**
 * Affichage du chronomètre. Le temps de référence vient du serveur
 * (`endsAt` + `serverNow`) ; l'horloge locale ne sert qu'à l'animation, et un
 * décalage est appliqué pour neutraliser une horloge client faussée.
 */
export function TimerDisplay({
  endsAt,
  serverNow,
  remainingSeconds,
  paused,
  onExpire,
}: {
  endsAt: string | null;
  serverNow: string;
  remainingSeconds: number | null;
  paused: boolean;
  onExpire?: () => void;
}) {
  const [remaining, setRemaining] = useState(remainingSeconds ?? 0);

  useEffect(() => {
    if (remainingSeconds === null || !endsAt) return;
    const offset = Date.now() - new Date(serverNow).getTime();
    const target = new Date(endsAt).getTime();
    const tick = () => {
      const left = Math.max(0, Math.round((target - (Date.now() - offset)) / 1000));
      setRemaining(left);
      if (left === 0) onExpire?.();
    };
    tick();
    if (paused) return;
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
    // onExpire volontairement hors dépendances : référence stable non garantie.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endsAt, serverNow, remainingSeconds, paused]);

  if (remainingSeconds === null) {
    return (
      <span className="pill" aria-label="Sans limite de temps">
        <IconClock size={13} /> Sans limite
      </span>
    );
  }
  const critical = remaining <= 60;
  const low = remaining <= 300;
  return (
    <span
      className={cn("pill tabular-nums", paused ? "pill-info" : critical ? "pill-danger" : low ? "pill-warning" : "pill-highlight")}
      role="timer"
      aria-live={critical ? "assertive" : "off"}
      aria-label={`Temps restant : ${Math.floor(remaining / 60)} minutes ${remaining % 60} secondes`}
    >
      <IconClock size={13} /> {paused ? "En pause" : formatDuration(remaining)}
    </span>
  );
}
