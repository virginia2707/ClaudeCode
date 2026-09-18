"use client";

import { useEffect, useState } from "react";

/**
 * Countdown driven by a server deadline. `now` returns the server-adjusted
 * time so the display matches the authoritative timer.
 */
export function useCountdown(endsAt: number | null, startedAt: number | null, now: () => number, paused = false) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!endsAt || paused) return;
    const id = setInterval(() => setTick((t) => t + 1), 100);
    return () => clearInterval(id);
  }, [endsAt, paused]);
  void tick;
  if (!endsAt || !startedAt) return { remainingMs: 0, ratio: 0, seconds: 0 };
  const total = Math.max(1, endsAt - startedAt);
  const remainingMs = Math.max(0, endsAt - now());
  return { remainingMs, ratio: remainingMs / total, seconds: Math.ceil(remainingMs / 1000) };
}
