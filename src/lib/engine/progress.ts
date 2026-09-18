import { parseJson } from "@/lib/json";
import { evaluateUnlock, type UnlockContext } from "@/lib/engine/unlock";
import type { StepState } from "@/lib/constants";

/** État d'une étape pour un acteur (joueur ou équipe). */
export type StepProgress = {
  state: StepState;
  startedAt?: string;
  completedAt?: string;
  attempts: number;
  wrongAttempts: number;
  hintsUsed: number;
  hintCost: number;
  earned: number;
};

export type StepStates = Record<string, StepProgress>;

export const emptyStepProgress = (): StepProgress => ({ state: "LOCKED", attempts: 0, wrongAttempts: 0, hintsUsed: 0, hintCost: 0, earned: 0 });

export function readStepStates(raw: string | null | undefined): StepStates {
  return parseJson<StepStates>(raw, {});
}

export function getStepProgress(states: StepStates, stepId: string): StepProgress {
  return states[stepId] ?? emptyStepProgress();
}

export type EngineStep = {
  id: string;
  order: number;
  unlockConditions: string;
  isFinal: boolean;
};

export type ComputeViewInput = {
  steps: EngineStep[];
  states: StepStates;
  unlockedCodes: Set<string>;
  trainerUnlockedStepIds: Set<string>;
  elapsedSeconds: number;
};

export type StepView = { stepId: string; order: number; state: StepState; lockedReason?: string; needsCode?: boolean };

/**
 * Recalcule l'état de toutes les étapes à partir des faits enregistrés.
 * L'état affiché n'est jamais lu depuis le client.
 */
export function computeStepViews(input: ComputeViewInput): { views: StepView[]; currentStepId: string | null } {
  const ordered = [...input.steps].sort((a, b) => a.order - b.order);
  const completedStepIds = new Set(ordered.filter((s) => input.states[s.id]?.state === "DONE").map((s) => s.id));
  const views: StepView[] = [];
  let currentStepId: string | null = null;

  for (let i = 0; i < ordered.length; i++) {
    const step = ordered[i];
    if (completedStepIds.has(step.id)) {
      views.push({ stepId: step.id, order: step.order, state: "DONE" });
      continue;
    }
    const ctx: UnlockContext = {
      stepIndex: i,
      completedStepIds,
      previousStepId: i > 0 ? ordered[i - 1].id : null,
      unlockedCodes: input.unlockedCodes,
      elapsedSeconds: input.elapsedSeconds,
      trainerUnlockedStepIds: input.trainerUnlockedStepIds,
      stepId: step.id,
    };
    const unlock = evaluateUnlock(step.unlockConditions, ctx);
    if (!unlock.unlocked) {
      views.push({ stepId: step.id, order: step.order, state: "LOCKED", lockedReason: unlock.reason, needsCode: unlock.needsCode });
      continue;
    }
    if (currentStepId === null) {
      currentStepId = step.id;
      views.push({ stepId: step.id, order: step.order, state: "CURRENT" });
    } else {
      views.push({ stepId: step.id, order: step.order, state: "AVAILABLE" });
    }
  }
  return { views, currentStepId };
}

/** La mission est-elle terminée ? (étape finale réussie, ou toutes les étapes réussies) */
export function isMissionComplete(steps: EngineStep[], states: StepStates) {
  if (steps.length === 0) return false;
  const finalStep = steps.find((s) => s.isFinal);
  if (finalStep) return states[finalStep.id]?.state === "DONE";
  return steps.every((s) => states[s.id]?.state === "DONE");
}

export function completionRatio(steps: EngineStep[], states: StepStates) {
  if (steps.length === 0) return 0;
  const done = steps.filter((s) => states[s.id]?.state === "DONE").length;
  return done / steps.length;
}
