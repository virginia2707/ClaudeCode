import "server-only";
import { prisma } from "@/lib/prisma";
import { parseJson } from "@/lib/json";
import { readSnapshot, toLearnerStepView, type GameSnapshot, type LearnerStepView } from "@/lib/sessions/snapshot";
import { validateSubmission } from "@/lib/puzzles/registry";
import { computeTimerState, type TimerState } from "@/lib/engine/timer";
import { completionRatio, computeStepViews, getStepProgress, isMissionComplete, readStepStates, type StepProgress, type StepStates, type StepView } from "@/lib/engine/progress";
import { clampScore, computeStepScore, type ScoringSettings } from "@/lib/engine/scoring";
import { awardableBadges } from "@/lib/engine/badges";
import { publish } from "@/lib/realtime/hub";
import { track } from "@/lib/analytics/track";
import { rateLimit } from "@/lib/auth/rate-limit";

const normalizeCode = (v: string) => v.replace(/[\s._-]/g, "").toUpperCase();

export type EngineError = { ok: false; error: string; code?: "LOCKED" | "NOT_RUNNING" | "EXPIRED" | "NO_ATTEMPTS" | "RATE_LIMITED" | "NOT_FOUND" };

type SessionRecord = NonNullable<Awaited<ReturnType<typeof loadSession>>>;

async function loadSession(sessionId: string) {
  return prisma.gameSession.findUnique({ where: { id: sessionId } });
}

function scoringFrom(snapshot: GameSnapshot): ScoringSettings {
  const s = snapshot.settings;
  return {
    basePoints: s.basePoints,
    timeBonusEnabled: s.timeBonusEnabled,
    timeBonusMax: s.timeBonusMax,
    noHintBonusEnabled: s.noHintBonusEnabled,
    noHintBonus: s.noHintBonus,
    streakBonusEnabled: s.streakBonusEnabled,
    streakBonus: s.streakBonus,
    hintPenaltyEnabled: s.hintPenaltyEnabled,
    wrongAnswerPenalty: s.wrongAnswerPenalty,
    timeoutPenalty: s.timeoutPenalty,
  };
}

export function timerFor(session: SessionRecord, snapshot: GameSnapshot): TimerState {
  return computeTimerState({
    timerMode: snapshot.settings.timerMode as "NONE" | "GLOBAL" | "PER_STEP",
    durationSeconds: session.durationSeconds,
    startedAt: session.startedAt,
    pausedAt: session.pausedAt,
    pausedTotalSeconds: session.pausedTotalSeconds,
    extendedSeconds: session.extendedSeconds,
    endedAt: session.endedAt,
  });
}

export type LearnerState = {
  session: { id: string; code: string; status: string; mode: string };
  game: { title: string; scenario: string; introduction: string; finalMessage: string; coverImageUrl: string | null };
  immersion: { sound: boolean; music: boolean; animations: boolean };
  timer: { remainingSeconds: number | null; elapsedSeconds: number; endsAt: string | null; expired: boolean; paused: boolean; serverNow: string };
  progress: {
    id: string;
    status: string;
    score: number;
    hintsUsed: number;
    wrongAnswers: number;
    stepsCompleted: number;
    stepsTotal: number;
    percent: number;
    actorName: string;
    unlockedCodes: string[];
  };
  steps: (StepView & { title: string; isFinal: boolean })[];
  currentStep: LearnerStepView | null;
  currentStepLocked: { reason?: string; needsCode?: boolean } | null;
  completed: boolean;
};

/** Construit l'état complet servi à un apprenant. Les réponses ne sortent jamais du serveur. */
export async function getLearnerState(sessionId: string, progressId: string): Promise<LearnerState | null> {
  const session = await loadSession(sessionId);
  if (!session) return null;
  const progress = await prisma.playerProgress.findFirst({
    where: { id: progressId, sessionId },
    include: { player: true, team: true, hintRequests: true },
  });
  if (!progress) return null;

  const snapshot = readSnapshot(session.gameSnapshot);
  const timer = timerFor(session, snapshot);
  const states = readStepStates(progress.stepStates);
  const unlockedCodes = new Set<string>(parseJson<string[]>(progress.unlockedCodes, []).map(normalizeCode));
  const trainerUnlocks = new Set<string>(parseJson<string[]>(progress.trainerUnlocks, []));

  const engineSteps = snapshot.steps.map((s) => ({ id: s.id, order: s.order, unlockConditions: s.unlockConditions, isFinal: s.isFinal }));
  const { views, currentStepId } = computeStepViews({
    steps: engineSteps,
    states,
    unlockedCodes,
    trainerUnlockedStepIds: trainerUnlocks,
    elapsedSeconds: timer.elapsedSeconds,
  });

  const completed = progress.status === "COMPLETED" || isMissionComplete(engineSteps, states);
  const revealedHints = new Set(progress.hintRequests.map((h) => h.hintId));
  const currentSnapshotStep = currentStepId ? snapshot.steps.find((s) => s.id === currentStepId) ?? null : null;
  const currentProgress = currentStepId ? getStepProgress(states, currentStepId) : null;
  const firstLocked = views.find((v) => v.state === "LOCKED");

  return {
    session: { id: session.id, code: session.code, status: session.status, mode: session.mode },
    game: {
      title: snapshot.title,
      scenario: snapshot.scenario,
      introduction: snapshot.introduction,
      finalMessage: snapshot.finalMessage,
      coverImageUrl: snapshot.coverImageUrl,
    },
    immersion: { sound: snapshot.settings.soundEnabled, music: snapshot.settings.musicEnabled, animations: snapshot.settings.animationsEnabled },
    timer: {
      remainingSeconds: timer.remainingSeconds,
      elapsedSeconds: timer.elapsedSeconds,
      endsAt: timer.endsAt ? timer.endsAt.toISOString() : null,
      expired: timer.expired,
      paused: timer.paused,
      serverNow: new Date().toISOString(),
    },
    progress: {
      id: progress.id,
      status: progress.status,
      score: progress.score,
      hintsUsed: progress.hintsUsed,
      wrongAnswers: progress.wrongAnswers,
      stepsCompleted: progress.stepsCompleted,
      stepsTotal: snapshot.steps.length,
      percent: Math.round(completionRatio(engineSteps, states) * 100),
      actorName: progress.team?.name ?? progress.player?.displayName ?? "Participant",
      unlockedCodes: [...unlockedCodes],
    },
    steps: views.map((v) => {
      const snap = snapshot.steps.find((s) => s.id === v.stepId);
      return { ...v, title: snap?.title ?? "", isFinal: snap?.isFinal ?? false };
    }),
    currentStep: currentSnapshotStep ? toLearnerStepView(currentSnapshotStep, revealedHints, currentProgress?.attempts ?? 0) : null,
    currentStepLocked: !currentSnapshotStep && firstLocked ? { reason: firstLocked.lockedReason, needsCode: firstLocked.needsCode } : null,
    completed,
  };
}

export type SubmitResult =
  | {
      ok: true;
      correct: boolean;
      pending?: boolean;
      feedback: string;
      explanation?: string;
      unlockCode?: string | null;
      scoreDelta?: number;
      missionComplete?: boolean;
      attemptsLeft?: number | null;
    }
  | EngineError;

/** Soumission d'une réponse. Toute la logique (validation, score, progression) est serveur. */
export async function submitAnswer(sessionId: string, progressId: string, stepId: string, submission: unknown): Promise<SubmitResult> {
  const limit = rateLimit(`submit:${progressId}`, 30, 60 * 1000);
  if (!limit.ok) return { ok: false, error: "Trop de tentatives rapprochées. Patientez quelques secondes.", code: "RATE_LIMITED" };

  const session = await loadSession(sessionId);
  if (!session) return { ok: false, error: "Session introuvable.", code: "NOT_FOUND" };
  if (session.status !== "RUNNING") {
    return { ok: false, error: session.status === "PAUSED" ? "La mission est en pause." : "La mission n'est pas en cours.", code: "NOT_RUNNING" };
  }

  const snapshot = readSnapshot(session.gameSnapshot);
  const timer = timerFor(session, snapshot);
  if (timer.expired) return { ok: false, error: "Le temps est écoulé.", code: "EXPIRED" };

  const progress = await prisma.playerProgress.findFirst({ where: { id: progressId, sessionId }, include: { hintRequests: true } });
  if (!progress) return { ok: false, error: "Progression introuvable.", code: "NOT_FOUND" };
  if (progress.status === "COMPLETED") return { ok: false, error: "Mission déjà terminée.", code: "NOT_RUNNING" };

  const states = readStepStates(progress.stepStates);
  const unlockedCodes = new Set<string>(parseJson<string[]>(progress.unlockedCodes, []).map(normalizeCode));
  const trainerUnlocks = new Set<string>(parseJson<string[]>(progress.trainerUnlocks, []));
  const engineSteps = snapshot.steps.map((s) => ({ id: s.id, order: s.order, unlockConditions: s.unlockConditions, isFinal: s.isFinal }));
  const { currentStepId } = computeStepViews({ steps: engineSteps, states, unlockedCodes, trainerUnlockedStepIds: trainerUnlocks, elapsedSeconds: timer.elapsedSeconds });

  // Anti-triche : on ne valide que l'étape réellement courante.
  if (currentStepId !== stepId) return { ok: false, error: "Cette étape n'est pas accessible.", code: "LOCKED" };

  const step = snapshot.steps.find((s) => s.id === stepId);
  if (!step?.puzzle) return { ok: false, error: "Énigme introuvable.", code: "NOT_FOUND" };

  const stepState: StepProgress = getStepProgress(states, stepId);
  if (step.puzzle.maxAttempts && stepState.attempts >= step.puzzle.maxAttempts) {
    return { ok: false, error: "Nombre de tentatives épuisé pour cette étape.", code: "NO_ATTEMPTS" };
  }

  const result = validateSubmission({
    type: step.puzzle.type,
    config: step.puzzle.config,
    answers: step.puzzle.answers,
    submission,
    options: { caseSensitive: step.puzzle.caseSensitive, accentSensitive: step.puzzle.accentSensitive },
  });

  const startedAt = stepState.startedAt ? new Date(stepState.startedAt) : null;
  const timeTaken = startedAt ? Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 1000)) : step.recommendedSeconds;
  const manual = step.puzzle.validationMode === "MANUAL";

  await track({ name: "answer_submitted", sessionId, gameId: snapshot.gameId, actorId: progressId, payload: { stepId } });

  // Validation manuelle : la réponse part en attente, sans révéler le verdict.
  if (manual) {
    const answer = await prisma.playerAnswer.create({
      data: {
        progressId,
        playerId: progress.playerId,
        stepId,
        submitted: JSON.stringify(submission),
        isCorrect: result.correct,
        status: "PENDING",
        timeTakenSeconds: timeTaken,
      },
      select: { id: true },
    });
    const nextStates: StepStates = { ...states, [stepId]: { ...stepState, state: "CURRENT", attempts: stepState.attempts + 1 } };
    await prisma.playerProgress.update({ where: { id: progressId }, data: { stepStates: JSON.stringify(nextStates) } });
    publish(sessionId, "progress_updated", { progressId, pending: true, answerId: answer.id });
    return { ok: true, correct: false, pending: true, feedback: "Réponse envoyée au formateur pour validation." };
  }

  if (!result.correct) {
    const nextStates: StepStates = {
      ...states,
      [stepId]: { ...stepState, state: "CURRENT", attempts: stepState.attempts + 1, wrongAttempts: stepState.wrongAttempts + 1 },
    };
    await prisma.$transaction(async (tx) => {
      await tx.playerAnswer.create({
        data: { progressId, playerId: progress.playerId, stepId, submitted: JSON.stringify(submission), isCorrect: false, status: "AUTO", scoreDelta: 0, timeTakenSeconds: timeTaken },
      });
      await tx.playerProgress.update({
        where: { id: progressId },
        data: { stepStates: JSON.stringify(nextStates), wrongAnswers: { increment: 1 }, streak: 0 },
      });
    });
    await track({ name: "answer_wrong", sessionId, gameId: snapshot.gameId, actorId: progressId, payload: { stepId } });
    publish(sessionId, "progress_updated", { progressId });
    const attemptsLeft = step.puzzle.maxAttempts ? Math.max(0, step.puzzle.maxAttempts - (stepState.attempts + 1)) : null;
    return {
      ok: true,
      correct: false,
      feedback: step.errorFeedback || "Ce n'est pas la bonne réponse. Relisez attentivement les données.",
      attemptsLeft,
    };
  }

  const applied = await applyCorrectAnswer({ sessionId, progressId, stepId, submission, timeTaken, ratio: result.ratio ?? 1 });
  return applied;
}

type ApplyInput = { sessionId: string; progressId: string; stepId: string; submission: unknown; timeTaken: number; ratio: number };

/** Applique une réussite : score, états, code obtenu, fin éventuelle de mission. */
async function applyCorrectAnswer(input: ApplyInput): Promise<SubmitResult> {
  const session = await loadSession(input.sessionId);
  if (!session) return { ok: false, error: "Session introuvable.", code: "NOT_FOUND" };
  const snapshot = readSnapshot(session.gameSnapshot);
  const step = snapshot.steps.find((s) => s.id === input.stepId);
  if (!step) return { ok: false, error: "Étape introuvable.", code: "NOT_FOUND" };

  const progress = await prisma.playerProgress.findUnique({ where: { id: input.progressId }, include: { hintRequests: true } });
  if (!progress) return { ok: false, error: "Progression introuvable.", code: "NOT_FOUND" };

  const states = readStepStates(progress.stepStates);
  const stepState = getStepProgress(states, input.stepId);
  const hintIdsOfStep = new Set((step.puzzle?.hints ?? []).map((h) => h.id));
  const hintsOnStep = progress.hintRequests.filter((h) => hintIdsOfStep.has(h.hintId));
  const hintCost = hintsOnStep.reduce((acc, h) => acc + h.pointCost, 0);

  const { components, total } = computeStepScore({
    settings: scoringFrom(snapshot),
    stepPoints: step.points,
    recommendedSeconds: step.recommendedSeconds,
    timeTakenSeconds: input.timeTaken,
    hintsUsedOnStep: hintsOnStep.length,
    wrongAttemptsOnStep: stepState.wrongAttempts,
    streakBefore: progress.streak,
    ratio: input.ratio,
  });

  const now = new Date();
  const nextStates: StepStates = {
    ...states,
    [input.stepId]: {
      ...stepState,
      state: "DONE",
      attempts: stepState.attempts + 1,
      completedAt: now.toISOString(),
      hintsUsed: hintsOnStep.length,
      hintCost,
      earned: total,
    },
  };
  const codes = new Set<string>(parseJson<string[]>(progress.unlockedCodes, []).map(normalizeCode));
  if (step.unlockCode) codes.add(normalizeCode(step.unlockCode));

  const engineSteps = snapshot.steps.map((s) => ({ id: s.id, order: s.order, unlockConditions: s.unlockConditions, isFinal: s.isFinal }));
  const missionComplete = isMissionComplete(engineSteps, nextStates);

  await prisma.$transaction(async (tx) => {
    await tx.playerAnswer.create({
      data: {
        progressId: input.progressId,
        playerId: progress.playerId,
        stepId: input.stepId,
        submitted: JSON.stringify(input.submission),
        isCorrect: true,
        status: "AUTO",
        scoreDelta: total,
        timeTakenSeconds: input.timeTaken,
      },
    });
    for (const c of components) {
      await tx.scoreEvent.create({ data: { progressId: input.progressId, stepId: input.stepId, type: c.type, delta: c.delta, note: c.note } });
    }
    // Le score est toujours recalculé depuis le journal d'événements : il
    // reste vérifiable et ne peut pas diverger.
    const ledger = await tx.scoreEvent.aggregate({ where: { progressId: input.progressId }, _sum: { delta: true } });
    await tx.playerProgress.update({
      where: { id: input.progressId },
      data: {
        stepStates: JSON.stringify(nextStates),
        unlockedCodes: JSON.stringify([...codes]),
        score: clampScore(ledger._sum.delta ?? 0),
        stepsCompleted: { increment: 1 },
        streak: { increment: 1 },
        status: missionComplete ? "COMPLETED" : "IN_PROGRESS",
        completedAt: missionComplete ? now : null,
        timeSpentSeconds: progress.startedAt ? Math.max(0, Math.floor((now.getTime() - progress.startedAt.getTime()) / 1000)) : progress.timeSpentSeconds,
      },
    });
  });

  await track({ name: "answer_correct", sessionId: input.sessionId, gameId: snapshot.gameId, actorId: input.progressId, payload: { stepId: input.stepId, delta: total } });
  await track({ name: "step_completed", sessionId: input.sessionId, gameId: snapshot.gameId, actorId: input.progressId, payload: { stepId: input.stepId } });
  publish(input.sessionId, "progress_updated", { progressId: input.progressId });
  publish(input.sessionId, "leaderboard_updated");

  if (missionComplete) {
    await finalizeProgress(input.progressId);
    await track({ name: "game_completed", sessionId: input.sessionId, gameId: snapshot.gameId, actorId: input.progressId });
  }

  return {
    ok: true,
    correct: true,
    feedback: step.successFeedback || "Bonne réponse.",
    explanation: step.explanation || undefined,
    unlockCode: step.unlockCode,
    scoreDelta: total,
    missionComplete,
  };
}

/** Le formateur tranche une réponse en attente de validation manuelle. */
export async function applyManualDecision(answerId: string, approve: boolean) {
  const answer = await prisma.playerAnswer.findUnique({ where: { id: answerId }, include: { progress: true } });
  if (!answer || answer.status !== "PENDING") return;
  await prisma.playerAnswer.update({ where: { id: answerId }, data: { status: approve ? "APPROVED" : "REJECTED" } });
  if (!approve) {
    await prisma.playerProgress.update({ where: { id: answer.progressId }, data: { wrongAnswers: { increment: 1 }, streak: 0 } });
    return;
  }
  await applyCorrectAnswer({
    sessionId: answer.progress.sessionId,
    progressId: answer.progressId,
    stepId: answer.stepId,
    submission: parseJson<unknown>(answer.submitted, ""),
    timeTaken: answer.timeTakenSeconds ?? 0,
    ratio: 1,
  });
}

export type HintResult = { ok: true; text: string; pointCost: number } | EngineError;

/** Révèle le prochain indice, avec son coût, et l'enregistre. */
export async function requestHint(sessionId: string, progressId: string, hintId: string): Promise<HintResult> {
  const limit = rateLimit(`hint:${progressId}`, 20, 60 * 1000);
  if (!limit.ok) return { ok: false, error: "Trop de demandes. Patientez un instant.", code: "RATE_LIMITED" };

  const session = await loadSession(sessionId);
  if (!session) return { ok: false, error: "Session introuvable.", code: "NOT_FOUND" };
  if (session.status !== "RUNNING") return { ok: false, error: "La mission n'est pas en cours.", code: "NOT_RUNNING" };

  const snapshot = readSnapshot(session.gameSnapshot);
  const progress = await prisma.playerProgress.findFirst({ where: { id: progressId, sessionId }, include: { hintRequests: true } });
  if (!progress) return { ok: false, error: "Progression introuvable.", code: "NOT_FOUND" };

  const timer = timerFor(session, snapshot);
  const states = readStepStates(progress.stepStates);
  const unlockedCodes = new Set<string>(parseJson<string[]>(progress.unlockedCodes, []).map(normalizeCode));
  const trainerUnlocks = new Set<string>(parseJson<string[]>(progress.trainerUnlocks, []));
  const engineSteps = snapshot.steps.map((s) => ({ id: s.id, order: s.order, unlockConditions: s.unlockConditions, isFinal: s.isFinal }));
  const { currentStepId } = computeStepViews({ steps: engineSteps, states, unlockedCodes, trainerUnlockedStepIds: trainerUnlocks, elapsedSeconds: timer.elapsedSeconds });

  const step = snapshot.steps.find((s) => s.id === currentStepId);
  const hint = step?.puzzle?.hints.find((h) => h.id === hintId);
  // Anti-triche : un indice ne peut être demandé que sur l'étape courante.
  if (!step || !hint) return { ok: false, error: "Indice indisponible.", code: "LOCKED" };

  const already = progress.hintRequests.find((h) => h.hintId === hintId);
  if (already) return { ok: true, text: hint.text, pointCost: already.pointCost };

  // Les indices se prennent dans l'ordre.
  const hints = step.puzzle?.hints ?? [];
  const usedIds = new Set(progress.hintRequests.map((h) => h.hintId));
  const expected = hints.find((h) => !usedIds.has(h.id));
  if (expected && expected.id !== hintId) return { ok: false, error: "Prenez les indices dans l'ordre.", code: "LOCKED" };

  const cost = snapshot.settings.hintPenaltyEnabled ? hint.pointCost : 0;
  await prisma.$transaction(async (tx) => {
    await tx.hintRequest.create({ data: { progressId, playerId: progress.playerId, hintId, grantedBy: "PLAYER", pointCost: cost } });
    if (cost > 0) await tx.scoreEvent.create({ data: { progressId, stepId: step.id, type: "HINT_PENALTY", delta: -cost, note: `Indice ${hint.order + 1}` } });
    // Le coût est débité immédiatement, et le score reste aligné sur le journal.
    const ledger = await tx.scoreEvent.aggregate({ where: { progressId }, _sum: { delta: true } });
    await tx.playerProgress.update({ where: { id: progressId }, data: { hintsUsed: { increment: 1 }, score: clampScore(ledger._sum.delta ?? 0) } });
  });
  await track({ name: "hint_requested", sessionId, gameId: snapshot.gameId, actorId: progressId, payload: { stepId: step.id, hintId } });
  publish(sessionId, "progress_updated", { progressId });
  return { ok: true, text: hint.text, pointCost: cost };
}

export type CodeResult = { ok: true; accepted: boolean; message: string } | EngineError;

/** Saisie d'un code de déblocage (étape protégée par un code). */
export async function enterCode(sessionId: string, progressId: string, rawCode: string): Promise<CodeResult> {
  const limit = rateLimit(`code:${progressId}`, 20, 60 * 1000);
  if (!limit.ok) return { ok: false, error: "Trop de tentatives. Patientez un instant.", code: "RATE_LIMITED" };

  const session = await loadSession(sessionId);
  if (!session) return { ok: false, error: "Session introuvable.", code: "NOT_FOUND" };
  const snapshot = readSnapshot(session.gameSnapshot);
  const progress = await prisma.playerProgress.findFirst({ where: { id: progressId, sessionId } });
  if (!progress) return { ok: false, error: "Progression introuvable.", code: "NOT_FOUND" };

  const code = normalizeCode(rawCode);
  const known = new Set(snapshot.steps.flatMap((s) => (s.unlockCode ? [normalizeCode(s.unlockCode)] : [])));
  if (!known.has(code)) return { ok: true, accepted: false, message: "Ce code ne correspond à aucune étape." };

  const codes = new Set<string>(parseJson<string[]>(progress.unlockedCodes, []).map(normalizeCode));
  codes.add(code);
  await prisma.playerProgress.update({ where: { id: progressId }, data: { unlockedCodes: JSON.stringify([...codes]) } });
  publish(sessionId, "progress_updated", { progressId });
  return { ok: true, accepted: true, message: "Code accepté." };
}

/** Fige le résultat d'un acteur et attribue les badges. */
export async function finalizeProgress(progressId: string) {
  const progress = await prisma.playerProgress.findUnique({
    where: { id: progressId },
    include: { session: true, team: { include: { members: true } }, player: true },
  });
  if (!progress) return;
  const snapshot = readSnapshot(progress.session.gameSnapshot);
  const states = readStepStates(progress.stepStates);
  const engineSteps = snapshot.steps.map((s) => ({ id: s.id, order: s.order, unlockConditions: s.unlockConditions, isFinal: s.isFinal }));
  const completed = isMissionComplete(engineSteps, states);

  // Bilan par compétence : validée si toutes les énigmes qui la portent sont réussies.
  const skillMap = new Map<string, { name: string; total: number; done: number }>();
  for (const step of snapshot.steps) {
    for (const skill of step.puzzle?.skills ?? []) {
      const entry = skillMap.get(skill.id) ?? { name: skill.name, total: 0, done: 0 };
      entry.total += 1;
      if (states[step.id]?.state === "DONE") entry.done += 1;
      skillMap.set(skill.id, entry);
    }
  }
  const skills = [...skillMap.entries()].map(([skillId, v]) => ({ skillId, name: v.name, validated: v.total > 0 && v.done === v.total, ratio: v.total ? v.done / v.total : 0 }));

  const recommendations: string[] = [];
  for (const s of skills) {
    if (!s.validated) recommendations.push(`Retravailler : ${s.name}.`);
  }
  if (progress.hintsUsed > Math.max(2, snapshot.steps.length)) recommendations.push("Vous avez utilisé beaucoup d'indices : reprenez les notions correspondantes.");
  if (progress.wrongAnswers === 0 && completed) recommendations.push("Aucune erreur : vous pouvez viser un niveau plus avancé.");
  if (recommendations.length === 0) recommendations.push("Continuez sur cette lancée : toutes les compétences visées sont acquises.");

  const maxScore = snapshot.steps.reduce((acc, s) => acc + s.points, 0);
  const now = new Date();
  const timeSpent = progress.startedAt ? Math.max(0, Math.floor((now.getTime() - progress.startedAt.getTime()) / 1000)) : progress.timeSpentSeconds;

  const badges = await prisma.badge.findMany({ where: { OR: [{ gameId: snapshot.gameId }, { isSystem: true, gameId: null }] } });
  const previousCompleted = await prisma.playerProgress.count({
    where: {
      id: { not: progress.id },
      status: "COMPLETED",
      ...(progress.playerId ? { player: { displayName: progress.player?.displayName } } : {}),
    },
  });
  const earned = awardableBadges(
    badges.map((b) => ({ id: b.id, code: b.code, name: b.name, ruleType: b.ruleType, ruleConfig: b.ruleConfig })),
    {
      completed,
      stepsCompleted: progress.stepsCompleted,
      stepsTotal: snapshot.steps.length,
      hintsUsed: progress.hintsUsed,
      wrongAnswers: progress.wrongAnswers,
      score: progress.score,
      maxScore,
      timeSpentSeconds: timeSpent,
      targetSeconds: progress.session.durationSeconds,
      isTeam: progress.actorType === "TEAM",
      isFirstGame: previousCompleted === 0,
    },
  );

  await prisma.$transaction(async (tx) => {
    await tx.playerProgress.update({
      where: { id: progress.id },
      data: { status: completed ? "COMPLETED" : progress.status, completedAt: completed ? now : progress.completedAt, timeSpentSeconds: timeSpent },
    });
    await tx.gameResult.upsert({
      where: { progressId: progress.id },
      update: {
        score: progress.score,
        timeSpentSeconds: timeSpent,
        stepsCompleted: progress.stepsCompleted,
        stepsTotal: snapshot.steps.length,
        hintsUsed: progress.hintsUsed,
        wrongAnswers: progress.wrongAnswers,
        skillsJson: JSON.stringify(skills),
        recommendations: JSON.stringify(recommendations),
      },
      create: {
        progressId: progress.id,
        score: progress.score,
        timeSpentSeconds: timeSpent,
        stepsCompleted: progress.stepsCompleted,
        stepsTotal: snapshot.steps.length,
        hintsUsed: progress.hintsUsed,
        wrongAnswers: progress.wrongAnswers,
        skillsJson: JSON.stringify(skills),
        recommendations: JSON.stringify(recommendations),
      },
    });
    for (const badge of earned) {
      await tx.playerBadge.upsert({
        where: { progressId_badgeId: { progressId: progress.id, badgeId: badge.id } },
        update: {},
        create: { progressId: progress.id, badgeId: badge.id },
      });
    }
  });
  publish(progress.sessionId, "leaderboard_updated");
}
