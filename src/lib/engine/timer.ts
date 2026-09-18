/**
 * Chronomètre serveur. Le navigateur n'est jamais la source de vérité : il
 * reçoit un instant de fin absolu et un décalage d'horloge mesuré au chargement.
 */
export type TimerInput = {
  timerMode: "NONE" | "GLOBAL" | "PER_STEP";
  durationSeconds: number | null;
  startedAt: Date | null;
  pausedAt: Date | null;
  pausedTotalSeconds: number;
  extendedSeconds: number;
  endedAt: Date | null;
};

export type TimerState = {
  /** Temps de jeu écoulé, pauses déduites. */
  elapsedSeconds: number;
  /** null quand il n'y a pas de limite. */
  remainingSeconds: number | null;
  /** Instant de fin absolu, pour l'affichage client. null si pas de limite. */
  endsAt: Date | null;
  expired: boolean;
  running: boolean;
  paused: boolean;
};

export function computeTimerState(input: TimerInput, now: Date = new Date()): TimerState {
  const paused = Boolean(input.pausedAt) && !input.endedAt;
  if (!input.startedAt) {
    const total = input.timerMode === "NONE" ? null : (input.durationSeconds ?? 0) + input.extendedSeconds;
    return { elapsedSeconds: 0, remainingSeconds: total, endsAt: null, expired: false, running: false, paused: false };
  }

  const reference = input.endedAt ?? input.pausedAt ?? now;
  const rawElapsed = Math.max(0, Math.floor((reference.getTime() - input.startedAt.getTime()) / 1000));
  const elapsedSeconds = Math.max(0, rawElapsed - input.pausedTotalSeconds);

  if (input.timerMode === "NONE" || input.durationSeconds === null) {
    return { elapsedSeconds, remainingSeconds: null, endsAt: null, expired: false, running: !input.endedAt && !paused, paused };
  }

  const totalSeconds = input.durationSeconds + input.extendedSeconds;
  const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);
  // Instant de fin absolu : décalé par les pauses déjà consommées et, si la
  // session est en pause, par la durée de la pause en cours.
  const pauseInProgress = paused && input.pausedAt ? Math.floor((now.getTime() - input.pausedAt.getTime()) / 1000) : 0;
  const endsAt = new Date(input.startedAt.getTime() + (totalSeconds + input.pausedTotalSeconds + pauseInProgress) * 1000);

  return {
    elapsedSeconds,
    remainingSeconds,
    endsAt,
    expired: remainingSeconds <= 0,
    running: !input.endedAt && !paused,
    paused,
  };
}

/** Secondes de pause à ajouter au cumul lors d'une reprise. */
export function pauseDurationSeconds(pausedAt: Date, now: Date = new Date()) {
  return Math.max(0, Math.floor((now.getTime() - pausedAt.getTime()) / 1000));
}
