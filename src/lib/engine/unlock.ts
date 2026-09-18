import { parseJson } from "@/lib/json";

/**
 * Conditions de déblocage d'une étape. Structure JSON typée et extensible :
 * { all: [ … ] } ou { any: [ … ] }, chaque règle portant un `type`.
 */
export type UnlockRule =
  | { type: "previous_step" }
  | { type: "step_completed"; stepId: string }
  | { type: "code"; value: string }
  | { type: "time_after"; seconds: number }
  | { type: "trainer_approval" };

export type UnlockConditions = { all?: UnlockRule[]; any?: UnlockRule[] };

export type UnlockContext = {
  stepIndex: number;
  completedStepIds: Set<string>;
  previousStepId: string | null;
  /** Codes déjà saisis/obtenus par l'acteur. */
  unlockedCodes: Set<string>;
  elapsedSeconds: number;
  trainerUnlockedStepIds: Set<string>;
  stepId: string;
};

export type UnlockResult = { unlocked: boolean; reason?: string; needsCode?: boolean };

const normalize = (v: string) => v.replace(/[\s._-]/g, "").toUpperCase();

function evaluateRule(rule: UnlockRule, ctx: UnlockContext): UnlockResult {
  switch (rule.type) {
    case "previous_step":
      if (ctx.stepIndex === 0) return { unlocked: true };
      if (!ctx.previousStepId) return { unlocked: true };
      return ctx.completedStepIds.has(ctx.previousStepId)
        ? { unlocked: true }
        : { unlocked: false, reason: "Terminez d'abord l'étape précédente." };
    case "step_completed":
      return ctx.completedStepIds.has(rule.stepId) ? { unlocked: true } : { unlocked: false, reason: "Une étape préalable n'est pas terminée." };
    case "code":
      return ctx.unlockedCodes.has(normalize(rule.value))
        ? { unlocked: true }
        : { unlocked: false, reason: "Un code est nécessaire pour ouvrir cette étape.", needsCode: true };
    case "time_after":
      return ctx.elapsedSeconds >= rule.seconds
        ? { unlocked: true }
        : { unlocked: false, reason: `Disponible après ${Math.ceil(rule.seconds / 60)} min de mission.` };
    case "trainer_approval":
      return ctx.trainerUnlockedStepIds.has(ctx.stepId)
        ? { unlocked: true }
        : { unlocked: false, reason: "En attente de validation du formateur." };
    default:
      return { unlocked: true };
  }
}

export function evaluateUnlock(rawConditions: string | UnlockConditions, ctx: UnlockContext): UnlockResult {
  const conditions: UnlockConditions = typeof rawConditions === "string" ? parseJson<UnlockConditions>(rawConditions, { all: [{ type: "previous_step" }] }) : rawConditions;

  if (Array.isArray(conditions.any) && conditions.any.length > 0) {
    const results = conditions.any.map((r) => evaluateRule(r, ctx));
    const ok = results.find((r) => r.unlocked);
    if (ok) return ok;
    return results[0] ?? { unlocked: true };
  }
  const rules = conditions.all ?? [{ type: "previous_step" as const }];
  for (const rule of rules) {
    const result = evaluateRule(rule, ctx);
    if (!result.unlocked) return result;
  }
  return { unlocked: true };
}

export const DEFAULT_UNLOCK: UnlockConditions = { all: [{ type: "previous_step" }] };
