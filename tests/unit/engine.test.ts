import { describe, expect, it } from "vitest";
import { computeTimerState, pauseDurationSeconds } from "@/lib/engine/timer";
import { evaluateUnlock, type UnlockContext } from "@/lib/engine/unlock";
import { clampScore, computeStepScore, type ScoringSettings } from "@/lib/engine/scoring";
import { completionRatio, computeStepViews, isMissionComplete, type EngineStep, type StepStates } from "@/lib/engine/progress";
import { rankEntries, type LeaderboardEntry } from "@/lib/engine/leaderboard";
import { awardableBadges, evaluateBadgeRule, SYSTEM_BADGES } from "@/lib/engine/badges";
import { generateSessionCode, isValidSessionCode, normalizeSessionCode } from "@/lib/engine/session-code";

const at = (iso: string) => new Date(iso);

describe("chronomètre serveur", () => {
  const base = { timerMode: "GLOBAL" as const, durationSeconds: 600, startedAt: at("2026-01-01T10:00:00Z"), pausedAt: null, pausedTotalSeconds: 0, extendedSeconds: 0, endedAt: null };

  it("calcule le temps restant", () => {
    const s = computeTimerState(base, at("2026-01-01T10:03:00Z"));
    expect(s.elapsedSeconds).toBe(180);
    expect(s.remainingSeconds).toBe(420);
    expect(s.expired).toBe(false);
    expect(s.running).toBe(true);
  });
  it("expire à zéro sans passer en négatif", () => {
    const s = computeTimerState(base, at("2026-01-01T10:20:00Z"));
    expect(s.remainingSeconds).toBe(0);
    expect(s.expired).toBe(true);
  });
  it("déduit les pauses du temps écoulé", () => {
    const s = computeTimerState({ ...base, pausedTotalSeconds: 120 }, at("2026-01-01T10:05:00Z"));
    expect(s.elapsedSeconds).toBe(180);
    expect(s.remainingSeconds).toBe(420);
  });
  it("fige le temps pendant une pause", () => {
    const paused = { ...base, pausedAt: at("2026-01-01T10:02:00Z") };
    const s1 = computeTimerState(paused, at("2026-01-01T10:05:00Z"));
    const s2 = computeTimerState(paused, at("2026-01-01T10:09:00Z"));
    expect(s1.elapsedSeconds).toBe(120);
    expect(s2.elapsedSeconds).toBe(120);
    expect(s1.paused).toBe(true);
    expect(s1.running).toBe(false);
  });
  it("repousse la fin quand du temps est ajouté", () => {
    const s = computeTimerState({ ...base, extendedSeconds: 300 }, at("2026-01-01T10:09:00Z"));
    expect(s.remainingSeconds).toBe(360);
    expect(s.expired).toBe(false);
  });
  it("n'expire jamais sans limite de temps", () => {
    const s = computeTimerState({ ...base, timerMode: "NONE", durationSeconds: null }, at("2027-01-01T10:00:00Z"));
    expect(s.remainingSeconds).toBeNull();
    expect(s.expired).toBe(false);
  });
  it("gèle le temps après la fin de session", () => {
    const s = computeTimerState({ ...base, endedAt: at("2026-01-01T10:04:00Z") }, at("2026-01-01T11:00:00Z"));
    expect(s.elapsedSeconds).toBe(240);
    expect(s.running).toBe(false);
  });
  it("mesure la durée d'une pause", () => {
    expect(pauseDurationSeconds(at("2026-01-01T10:00:00Z"), at("2026-01-01T10:01:30Z"))).toBe(90);
  });
});

describe("conditions de déblocage", () => {
  const ctx = (over: Partial<UnlockContext> = {}): UnlockContext => ({
    stepIndex: 1,
    completedStepIds: new Set<string>(),
    previousStepId: "s1",
    unlockedCodes: new Set<string>(),
    elapsedSeconds: 0,
    trainerUnlockedStepIds: new Set<string>(),
    stepId: "s2",
    ...over,
  });

  it("exige l'étape précédente par défaut", () => {
    expect(evaluateUnlock('{"all":[{"type":"previous_step"}]}', ctx()).unlocked).toBe(false);
    expect(evaluateUnlock('{"all":[{"type":"previous_step"}]}', ctx({ completedStepIds: new Set(["s1"]) })).unlocked).toBe(true);
  });
  it("ouvre toujours la première étape", () => {
    expect(evaluateUnlock('{"all":[{"type":"previous_step"}]}', ctx({ stepIndex: 0, previousStepId: null })).unlocked).toBe(true);
  });
  it("exige un code, en ignorant tirets et casse", () => {
    const rule = '{"all":[{"type":"code","value":"47-29"}]}';
    expect(evaluateUnlock(rule, ctx()).needsCode).toBe(true);
    expect(evaluateUnlock(rule, ctx({ unlockedCodes: new Set(["4729"]) })).unlocked).toBe(true);
  });
  it("combine plusieurs conditions avec ET", () => {
    const rule = '{"all":[{"type":"step_completed","stepId":"s1"},{"type":"code","value":"ABC"}]}';
    expect(evaluateUnlock(rule, ctx({ completedStepIds: new Set(["s1"]) })).unlocked).toBe(false);
    expect(evaluateUnlock(rule, ctx({ completedStepIds: new Set(["s1"]), unlockedCodes: new Set(["ABC"]) })).unlocked).toBe(true);
  });
  it("accepte une alternative avec OU", () => {
    const rule = '{"any":[{"type":"code","value":"ABC"},{"type":"trainer_approval"}]}';
    expect(evaluateUnlock(rule, ctx()).unlocked).toBe(false);
    expect(evaluateUnlock(rule, ctx({ trainerUnlockedStepIds: new Set(["s2"]) })).unlocked).toBe(true);
  });
  it("gère une ouverture différée dans le temps", () => {
    const rule = '{"all":[{"type":"time_after","seconds":600}]}';
    expect(evaluateUnlock(rule, ctx({ elapsedSeconds: 300 })).unlocked).toBe(false);
    expect(evaluateUnlock(rule, ctx({ elapsedSeconds: 900 })).unlocked).toBe(true);
  });
  it("retombe sur la règle par défaut si le JSON est corrompu", () => {
    expect(evaluateUnlock("{ pas du json", ctx({ completedStepIds: new Set(["s1"]) })).unlocked).toBe(true);
  });
});

describe("scoring", () => {
  const settings: ScoringSettings = {
    basePoints: 100,
    timeBonusEnabled: true,
    timeBonusMax: 50,
    noHintBonusEnabled: true,
    noHintBonus: 20,
    streakBonusEnabled: true,
    streakBonus: 10,
    hintPenaltyEnabled: true,
    wrongAnswerPenalty: 5,
    timeoutPenalty: 0,
  };
  const input = { settings, stepPoints: 100, recommendedSeconds: 300, timeTakenSeconds: 150, hintsUsedOnStep: 0, wrongAttemptsOnStep: 0, streakBefore: 0, ratio: 1 };

  it("cumule base et bonus", () => {
    const r = computeStepScore(input);
    expect(r.components.find((c) => c.type === "STEP_SUCCESS")?.delta).toBe(100);
    expect(r.components.find((c) => c.type === "TIME_BONUS")?.delta).toBe(25);
    expect(r.components.find((c) => c.type === "NO_HINT_BONUS")?.delta).toBe(20);
    expect(r.total).toBe(145);
  });
  it("applique la pénalité d'erreur et retire le bonus sans indice", () => {
    const r = computeStepScore({ ...input, hintsUsedOnStep: 2, wrongAttemptsOnStep: 2 });
    expect(r.components.find((c) => c.type === "WRONG_ANSWER_PENALTY")?.delta).toBe(-10);
    expect(r.components.find((c) => c.type === "NO_HINT_BONUS")).toBeUndefined();
    expect(r.total).toBe(115);
  });
  it("n'inclut pas le coût des indices (débité à la demande)", () => {
    const r = computeStepScore({ ...input, hintsUsedOnStep: 1 });
    expect(r.components.some((c) => c.type === "HINT_PENALTY")).toBe(false);
  });
  it("crédite un score partiel", () => {
    const r = computeStepScore({ ...input, ratio: 0.5, timeTakenSeconds: 300 });
    expect(r.components.find((c) => c.type === "STEP_SUCCESS")?.delta).toBe(50);
  });
  it("plafonne le bonus de série", () => {
    const r = computeStepScore({ ...input, streakBefore: 9 });
    expect(r.components.find((c) => c.type === "STREAK_BONUS")?.delta).toBe(50);
  });
  it("respecte les mécanismes désactivés", () => {
    const off: ScoringSettings = { ...settings, timeBonusEnabled: false, noHintBonusEnabled: false, streakBonusEnabled: false, hintPenaltyEnabled: false, wrongAnswerPenalty: 0 };
    const r = computeStepScore({ ...input, settings: off, wrongAttemptsOnStep: 3, streakBefore: 4 });
    expect(r.total).toBe(100);
    expect(r.components).toHaveLength(1);
  });
  it("ne descend jamais sous zéro", () => {
    expect(clampScore(-42)).toBe(0);
  });
});

describe("progression", () => {
  const steps: EngineStep[] = [
    { id: "s1", order: 0, unlockConditions: '{"all":[{"type":"previous_step"}]}', isFinal: false },
    { id: "s2", order: 1, unlockConditions: '{"all":[{"type":"previous_step"}]}', isFinal: false },
    { id: "s3", order: 2, unlockConditions: '{"all":[{"type":"previous_step"}]}', isFinal: true },
  ];
  const done = (ids: string[]): StepStates => Object.fromEntries(ids.map((id) => [id, { state: "DONE" as const, attempts: 1, wrongAttempts: 0, hintsUsed: 0, hintCost: 0, earned: 100 }]));

  it("ouvre la première étape et verrouille les suivantes", () => {
    const { views, currentStepId } = computeStepViews({ steps, states: {}, unlockedCodes: new Set(), trainerUnlockedStepIds: new Set(), elapsedSeconds: 0 });
    expect(views.map((v) => v.state)).toEqual(["CURRENT", "LOCKED", "LOCKED"]);
    expect(currentStepId).toBe("s1");
  });
  it("avance après une réussite", () => {
    const { views, currentStepId } = computeStepViews({ steps, states: done(["s1"]), unlockedCodes: new Set(), trainerUnlockedStepIds: new Set(), elapsedSeconds: 0 });
    expect(views.map((v) => v.state)).toEqual(["DONE", "CURRENT", "LOCKED"]);
    expect(currentStepId).toBe("s2");
  });
  it("détecte la fin de mission sur l'étape finale", () => {
    expect(isMissionComplete(steps, done(["s1", "s2"]))).toBe(false);
    expect(isMissionComplete(steps, done(["s1", "s2", "s3"]))).toBe(true);
  });
  it("calcule la progression en pourcentage", () => {
    expect(completionRatio(steps, done(["s1", "s2"]))).toBeCloseTo(2 / 3);
  });
  it("indique la raison du verrouillage", () => {
    const { views } = computeStepViews({ steps, states: {}, unlockedCodes: new Set(), trainerUnlockedStepIds: new Set(), elapsedSeconds: 0 });
    expect(views[1].lockedReason).toContain("étape précédente");
  });
});

describe("classement", () => {
  const entries: LeaderboardEntry[] = [
    { actorId: "a", name: "Alpha", score: 300, stepsCompleted: 3, skillsValidated: 3, hintsUsed: 4, wrongAnswers: 2, timeSpentSeconds: 600, completed: true },
    { actorId: "b", name: "Beta", score: 500, stepsCompleted: 2, skillsValidated: 2, hintsUsed: 0, wrongAnswers: 0, timeSpentSeconds: 300, completed: false },
    { actorId: "c", name: "Gamma", score: 280, stepsCompleted: 3, skillsValidated: 3, hintsUsed: 1, wrongAnswers: 1, timeSpentSeconds: 900, completed: true },
  ];
  it("mode pédagogique : étapes et compétences d'abord, score ensuite, rapidité en dernier", () => {
    const r = rankEntries(entries, "PEDAGOGICAL");
    // a et c ont 3 étapes et 3 compétences ; a passe devant au score (qui intègre
    // déjà la pénalité d'indices). b, plus rapide mais moins avancé, finit dernier.
    expect(r[0].actorId).toBe("a");
    expect(r[1].actorId).toBe("c");
    expect(r[2].actorId).toBe("b");
  });
  it("mode pédagogique : un joueur plus lent mais plus avancé passe devant", () => {
    const slowButFurther: LeaderboardEntry = { actorId: "slow", name: "Lent", score: 100, stepsCompleted: 5, skillsValidated: 5, hintsUsed: 3, wrongAnswers: 3, timeSpentSeconds: 3000, completed: true };
    const fastButBehind: LeaderboardEntry = { actorId: "fast", name: "Rapide", score: 900, stepsCompleted: 1, skillsValidated: 1, hintsUsed: 0, wrongAnswers: 0, timeSpentSeconds: 60, completed: false };
    expect(rankEntries([fastButBehind, slowButFurther], "PEDAGOGICAL")[0].actorId).toBe("slow");
    expect(rankEntries([fastButBehind, slowButFurther], "SCORE")[0].actorId).toBe("fast");
  });
  it("mode score : le score prime", () => {
    expect(rankEntries(entries, "SCORE")[0].actorId).toBe("b");
  });
  it("mode temps : les non-terminés passent après", () => {
    const r = rankEntries(entries, "TIME");
    expect(r[0].actorId).toBe("a");
    expect(r[2].actorId).toBe("b");
  });
  it("mode indices : le moins d'indices gagne", () => {
    expect(rankEntries(entries, "HINTS")[0].actorId).toBe("b");
  });
  it("attribue des rangs ex æquo identiques", () => {
    const tie: LeaderboardEntry[] = [
      { ...entries[0], actorId: "x", name: "Même" },
      { ...entries[0], actorId: "y", name: "Même" },
    ];
    const r = rankEntries(tie, "SCORE");
    expect(r[0].rank).toBe(1);
    expect(r[1].rank).toBe(1);
  });
});

describe("badges", () => {
  const ctx = {
    completed: true,
    stepsCompleted: 5,
    stepsTotal: 5,
    hintsUsed: 0,
    wrongAnswers: 0,
    score: 500,
    maxScore: 500,
    timeSpentSeconds: 600,
    targetSeconds: 1800,
    isTeam: false,
    isFirstGame: true,
  };
  it("attribue les badges mérités", () => {
    const earned = awardableBadges(SYSTEM_BADGES.map((b, i) => ({ id: String(i), ...b })), ctx).map((b) => b.code);
    expect(earned).toContain("FIRST_ESCAPE");
    expect(earned).toContain("MASTER_SOLVER");
    expect(earned).toContain("NO_HINT");
    expect(earned).toContain("SPEED_RUNNER");
    expect(earned).toContain("PERFECT_SCORE");
    expect(earned).not.toContain("TEAM_PLAYER");
  });
  it("refuse NO_HINT si un indice a été utilisé", () => {
    expect(evaluateBadgeRule("NO_HINT", "{}", { ...ctx, hintsUsed: 1 })).toBe(false);
  });
  it("refuse SPEED_RUNNER si le temps dépasse le seuil", () => {
    expect(evaluateBadgeRule("SPEED_RUNNER", '{"ratio":0.5}', { ...ctx, timeSpentSeconds: 1500 })).toBe(false);
  });
  it("gère une règle personnalisée à seuils", () => {
    expect(evaluateBadgeRule("CUSTOM", '{"minScore":1000}', ctx)).toBe(false);
    expect(evaluateBadgeRule("CUSTOM", '{"minSteps":3,"maxHints":0}', ctx)).toBe(true);
  });
});

describe("codes de session", () => {
  it("génère des codes valides sans caractères ambigus", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateSessionCode();
      expect(code).toHaveLength(6);
      expect(isValidSessionCode(code)).toBe(true);
      expect(code).not.toMatch(/[O0I1L]/);
    }
  });
  it("normalise la saisie", () => {
    expect(normalizeSessionCode(" x7k-9p2 ")).toBe("X7K9P2");
  });
});
