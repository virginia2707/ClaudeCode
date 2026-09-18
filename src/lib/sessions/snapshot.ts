import "server-only";
import { parseJson } from "@/lib/json";
import { defaultConfigFor } from "@/lib/puzzles/registry";
import type { OwnedGame } from "@/lib/games/queries";

/**
 * Snapshot figé du jeu au lancement d'une session : les modifications
 * ultérieures du jeu n'affectent pas une session en cours.
 * Il contient les réponses : il n'est JAMAIS envoyé au client tel quel
 * (voir toLearnerView).
 */
export type SnapshotHint = { id: string; order: number; text: string; pointCost: number; timeCostSeconds: number };
export type SnapshotStep = {
  id: string;
  order: number;
  title: string;
  description: string;
  instruction: string;
  content: string;
  imageUrl: string | null;
  fileUrl: string | null;
  fileName: string | null;
  videoUrl: string | null;
  unlockCode: string | null;
  unlockConditions: string;
  points: number;
  recommendedSeconds: number;
  difficulty: string;
  isFinal: boolean;
  successFeedback: string;
  errorFeedback: string;
  explanation: string;
  puzzle: {
    type: string;
    prompt: string;
    config: Record<string, unknown>;
    validationMode: string;
    maxAttempts: number | null;
    caseSensitive: boolean;
    accentSensitive: boolean;
    answers: unknown[];
    hints: SnapshotHint[];
    skills: { id: string; name: string }[];
  } | null;
};

export type GameSnapshot = {
  gameId: string;
  version: number;
  title: string;
  description: string;
  scenario: string;
  introduction: string;
  finalMessage: string;
  coverImageUrl: string | null;
  mode: string;
  estimatedMinutes: number;
  settings: {
    timerMode: string;
    maxMinutes: number | null;
    pauseAllowed: boolean;
    endOnTimeout: boolean;
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
    leaderboardEnabled: boolean;
    leaderboardMethod: string;
    showLiveRanking: boolean;
    soundEnabled: boolean;
    musicEnabled: boolean;
    animationsEnabled: boolean;
  };
  steps: SnapshotStep[];
};

export function buildSnapshot(game: OwnedGame): GameSnapshot {
  const s = game.settings;
  return {
    gameId: game.id,
    version: game.version,
    title: game.title,
    description: game.description,
    scenario: game.scenario,
    introduction: game.introduction,
    finalMessage: game.finalMessage,
    coverImageUrl: game.coverImageUrl,
    mode: game.mode,
    estimatedMinutes: game.estimatedMinutes,
    settings: {
      timerMode: s?.timerMode ?? "NONE",
      maxMinutes: s?.maxMinutes ?? null,
      pauseAllowed: s?.pauseAllowed ?? true,
      endOnTimeout: s?.endOnTimeout ?? true,
      basePoints: s?.basePoints ?? 100,
      timeBonusEnabled: s?.timeBonusEnabled ?? true,
      timeBonusMax: s?.timeBonusMax ?? 50,
      noHintBonusEnabled: s?.noHintBonusEnabled ?? true,
      noHintBonus: s?.noHintBonus ?? 20,
      streakBonusEnabled: s?.streakBonusEnabled ?? true,
      streakBonus: s?.streakBonus ?? 10,
      hintPenaltyEnabled: s?.hintPenaltyEnabled ?? true,
      wrongAnswerPenalty: s?.wrongAnswerPenalty ?? 0,
      timeoutPenalty: s?.timeoutPenalty ?? 0,
      leaderboardEnabled: s?.leaderboardEnabled ?? true,
      leaderboardMethod: s?.leaderboardMethod ?? "PEDAGOGICAL",
      showLiveRanking: s?.showLiveRanking ?? true,
      soundEnabled: s?.soundEnabled ?? false,
      musicEnabled: s?.musicEnabled ?? false,
      animationsEnabled: s?.animationsEnabled ?? true,
    },
    steps: game.steps.map((step) => ({
      id: step.id,
      order: step.order,
      title: step.title,
      description: step.description,
      instruction: step.instruction,
      content: step.content,
      imageUrl: step.imageUrl,
      fileUrl: step.fileUrl,
      fileName: step.fileName,
      videoUrl: step.videoUrl,
      unlockCode: step.unlockCode,
      unlockConditions: step.unlockConditions,
      points: step.points,
      recommendedSeconds: step.recommendedSeconds,
      difficulty: step.difficulty,
      isFinal: step.isFinal,
      successFeedback: step.successFeedback,
      errorFeedback: step.errorFeedback,
      explanation: step.explanation,
      puzzle: step.puzzle
        ? {
            type: step.puzzle.type,
            prompt: step.puzzle.prompt,
            config: parseJson<Record<string, unknown>>(step.puzzle.config, defaultConfigFor(step.puzzle.type) as Record<string, unknown>),
            validationMode: step.puzzle.validationMode,
            maxAttempts: step.puzzle.maxAttempts,
            caseSensitive: step.puzzle.caseSensitive,
            accentSensitive: step.puzzle.accentSensitive,
            answers: step.puzzle.answers.map((a) => parseJson<unknown>(a.value, "")),
            hints: step.puzzle.hints.map((h) => ({ id: h.id, order: h.order, text: h.text, pointCost: h.pointCost, timeCostSeconds: h.timeCostSeconds })),
            skills: step.puzzle.skills.map((ps) => ({ id: ps.skillId, name: ps.skill.name })),
          }
        : null,
    })),
  };
}

export function readSnapshot(raw: string): GameSnapshot {
  return parseJson<GameSnapshot>(raw, {
    gameId: "",
    version: 1,
    title: "",
    description: "",
    scenario: "",
    introduction: "",
    finalMessage: "",
    coverImageUrl: null,
    mode: "INDIVIDUAL",
    estimatedMinutes: 0,
    settings: {
      timerMode: "NONE",
      maxMinutes: null,
      pauseAllowed: true,
      endOnTimeout: true,
      basePoints: 100,
      timeBonusEnabled: false,
      timeBonusMax: 0,
      noHintBonusEnabled: false,
      noHintBonus: 0,
      streakBonusEnabled: false,
      streakBonus: 0,
      hintPenaltyEnabled: true,
      wrongAnswerPenalty: 0,
      timeoutPenalty: 0,
      leaderboardEnabled: false,
      leaderboardMethod: "PEDAGOGICAL",
      showLiveRanking: false,
      soundEnabled: false,
      musicEnabled: false,
      animationsEnabled: true,
    },
    steps: [],
  });
}

/** Vue d'une étape servie à l'apprenant : sans réponses, sans indices non révélés. */
export type LearnerStepView = {
  id: string;
  order: number;
  title: string;
  instruction: string;
  content: string;
  imageUrl: string | null;
  fileUrl: string | null;
  fileName: string | null;
  videoUrl: string | null;
  points: number;
  recommendedSeconds: number;
  puzzleType: string;
  prompt: string;
  config: Record<string, unknown>;
  /** Indices : texte seulement pour ceux déjà débloqués. */
  hints: { id: string; order: number; pointCost: number; timeCostSeconds: number; text: string | null }[];
  attemptsLeft: number | null;
  skills: string[];
};

export function toLearnerStepView(step: SnapshotStep, revealedHintIds: Set<string>, attemptsUsed: number): LearnerStepView {
  const puzzle = step.puzzle;
  const config = puzzle ? sanitizeConfig(puzzle.type, puzzle.config) : {};
  return {
    id: step.id,
    order: step.order,
    title: step.title,
    instruction: step.instruction,
    content: step.content,
    imageUrl: step.imageUrl,
    fileUrl: step.fileUrl,
    fileName: step.fileName,
    videoUrl: step.videoUrl,
    points: step.points,
    recommendedSeconds: step.recommendedSeconds,
    puzzleType: puzzle?.type ?? "SHORT_ANSWER",
    prompt: puzzle?.prompt ?? "",
    config,
    hints: (puzzle?.hints ?? []).map((h) => ({
      id: h.id,
      order: h.order,
      pointCost: h.pointCost,
      timeCostSeconds: h.timeCostSeconds,
      text: revealedHintIds.has(h.id) ? h.text : null,
    })),
    attemptsLeft: puzzle?.maxAttempts ? Math.max(0, puzzle.maxAttempts - attemptsUsed) : null,
    skills: puzzle?.skills.map((s) => s.name) ?? [],
  };
}

/**
 * Retire de la configuration tout ce qui révélerait la réponse
 * (ex. : coordonnées des zones cliquables d'une image interactive).
 */
function sanitizeConfig(type: string, config: Record<string, unknown>): Record<string, unknown> {
  if (type === "IMAGE_HOTSPOT") {
    return { imageUrl: config.imageUrl ?? "" };
  }
  if (type === "MATCHING") {
    const pairs = (config.pairs as { id: string; left: string; right: string }[]) ?? [];
    return { pairs, partialCredit: config.partialCredit };
  }
  return config;
}
