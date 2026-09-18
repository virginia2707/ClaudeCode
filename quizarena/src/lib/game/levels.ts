/**
 * Player levels. Names are gamification flavour only — never a professional
 * qualification. Thresholds/names can be overridden per trainer/organisation
 * by passing a custom LevelConfig (stored as JSON on User.levelConfig).
 */
export type Level = { level: number; name: string; minXp: number };
export type LevelConfig = Level[];

export const DEFAULT_LEVELS: LevelConfig = [
  { level: 1, name: "Rookie", minXp: 0 },
  { level: 2, name: "Challenger", minXp: 1_000 },
  { level: 3, name: "Competitor", minXp: 2_500 },
  { level: 4, name: "Master", minXp: 5_000 },
  { level: 5, name: "Legend", minXp: 10_000 },
];

export function levelFor(rawXp: number, config: LevelConfig = DEFAULT_LEVELS): Level {
  const xp = Math.max(0, rawXp);
  const sorted = [...config].sort((a, b) => a.minXp - b.minXp);
  let current = sorted[0];
  for (const lvl of sorted) {
    if (xp >= lvl.minXp) current = lvl;
  }
  return current;
}

export function nextLevel(rawXp: number, config: LevelConfig = DEFAULT_LEVELS): Level | null {
  const xp = Math.max(0, rawXp);
  const sorted = [...config].sort((a, b) => a.minXp - b.minXp);
  return sorted.find((l) => l.minXp > xp) ?? null;
}

/** Progress (0..1) towards the next level; 1 when at max level. */
export function levelProgress(rawXp: number, config: LevelConfig = DEFAULT_LEVELS): number {
  const xp = Math.max(0, rawXp);
  const current = levelFor(xp, config);
  const next = nextLevel(xp, config);
  if (!next) return 1;
  const span = next.minXp - current.minXp;
  return span <= 0 ? 1 : Math.min(1, Math.max(0, (xp - current.minXp) / span));
}
