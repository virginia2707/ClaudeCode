/** Calcul du score, exclusivement serveur. Chaque composante est journalisée. */
export type ScoringSettings = {
  basePoints: number;
  timeBonusEnabled: boolean;
  timeBonusMax: number;
  noHintBonusEnabled: boolean;
  noHintBonus: number;
  streakBonusEnabled: boolean;
  streakBonus: number;
  hintPenaltyEnabled: boolean;
  wrongAnswerPenalty: number;
  timeoutPenalty: number;
};

export type ScoreComponent = { type: string; delta: number; note?: string };

export type StepScoreInput = {
  settings: ScoringSettings;
  stepPoints: number;
  recommendedSeconds: number;
  timeTakenSeconds: number;
  hintsUsedOnStep: number;
  wrongAttemptsOnStep: number;
  streakBefore: number;
  /** Ratio de réussite (1 = complet, 0.5 = partiel sur association/ordre). */
  ratio: number;
};

/**
 * Score d'une étape réussie, décomposé en événements.
 * Le coût des indices n'apparaît pas ici : il est débité au moment de la
 * demande (voir requestHint), pour être visible immédiatement et rester dû
 * même si l'étape n'est jamais résolue.
 */
export function computeStepScore(input: StepScoreInput): { components: ScoreComponent[]; total: number } {
  const s = input.settings;
  const components: ScoreComponent[] = [];

  const base = Math.round((input.stepPoints || s.basePoints) * Math.max(0, Math.min(1, input.ratio)));
  components.push({ type: "STEP_SUCCESS", delta: base });

  if (s.timeBonusEnabled && input.recommendedSeconds > 0 && s.timeBonusMax > 0) {
    const saved = Math.max(0, input.recommendedSeconds - input.timeTakenSeconds);
    const bonus = Math.round((saved / input.recommendedSeconds) * s.timeBonusMax);
    if (bonus > 0) components.push({ type: "TIME_BONUS", delta: bonus, note: `${saved}s sous le temps recommandé` });
  }
  if (s.noHintBonusEnabled && input.hintsUsedOnStep === 0 && s.noHintBonus > 0) {
    components.push({ type: "NO_HINT_BONUS", delta: s.noHintBonus });
  }
  if (s.streakBonusEnabled && input.streakBefore > 0 && s.streakBonus > 0) {
    components.push({ type: "STREAK_BONUS", delta: s.streakBonus * Math.min(input.streakBefore, 5), note: `série de ${input.streakBefore}` });
  }
  if (s.wrongAnswerPenalty > 0 && input.wrongAttemptsOnStep > 0) {
    components.push({ type: "WRONG_ANSWER_PENALTY", delta: -(s.wrongAnswerPenalty * input.wrongAttemptsOnStep), note: `${input.wrongAttemptsOnStep} erreur(s)` });
  }

  const total = components.reduce((acc, c) => acc + c.delta, 0);
  return { components, total };
}

/** Le score d'un acteur ne descend jamais sous zéro. */
export function clampScore(score: number) {
  return Math.max(0, Math.round(score));
}
