import { z } from "zod";
import { PUZZLE_TYPES } from "@/lib/puzzles/types";
import { DIFFICULTIES, LEVELS } from "@/lib/constants";

/**
 * Contrat d'un fournisseur d'IA. Toute la plateforme passe par cette
 * interface : changer de fournisseur (ou repasser au stub hors-ligne) ne
 * demande aucune modification des appelants.
 */

export const generationRequestSchema = z.object({
  subject: z.string().trim().min(2, "Sujet trop court").max(200, "Sujet trop long"),
  level: z.enum(LEVELS),
  durationMinutes: z.coerce.number().int().min(10, "10 minutes minimum").max(240, "240 minutes maximum"),
  stepCount: z.coerce.number().int().min(2, "2 étapes minimum").max(10, "10 étapes maximum"),
  objectives: z.string().trim().max(600, "Objectifs trop longs").default(""),
  audience: z.string().trim().max(200).default(""),
});
export type GenerationRequest = z.infer<typeof generationRequestSchema>;

/** Une étape proposée par l'IA. Volontairement limitée aux types d'énigmes simples à relire. */
export const generatedStepSchema = z.object({
  title: z.string().max(120),
  instruction: z.string().max(1200),
  content: z.string().max(2000).default(""),
  puzzleType: z.enum(PUZZLE_TYPES),
  prompt: z.string().max(1200),
  answers: z.array(z.string().max(200)).min(1).max(5),
  choices: z.array(z.string().max(200)).max(6).default([]),
  correctChoiceIndexes: z.array(z.number().int().min(0).max(5)).max(6).default([]),
  hints: z.array(z.string().max(300)).max(3).default([]),
  unlockCode: z.string().max(40).default(""),
  skill: z.string().max(80),
  difficulty: z.enum(DIFFICULTIES),
  points: z.number().int().min(0).max(1000),
  recommendedSeconds: z.number().int().min(30).max(3600),
  successFeedback: z.string().max(600).default(""),
  errorFeedback: z.string().max(600).default(""),
  explanation: z.string().max(800).default(""),
});
export type GeneratedStep = z.infer<typeof generatedStepSchema>;

export const generatedGameSchema = z.object({
  title: z.string().max(120),
  description: z.string().max(800),
  scenario: z.string().max(2500),
  introduction: z.string().max(1200).default(""),
  finalMessage: z.string().max(1200).default(""),
  objective: z.string().max(800).default(""),
  skills: z.array(z.string().max(80)).min(1).max(12),
  steps: z.array(generatedStepSchema).min(2).max(10),
});
export type GeneratedGame = z.infer<typeof generatedGameSchema>;

export interface AIProvider {
  /** Identifiant enregistré dans AIJob.provider. */
  readonly name: string;
  /** Le fournisseur est-il utilisable dans cet environnement ? */
  isAvailable(): boolean;
  generateGame(request: GenerationRequest): Promise<GeneratedGame>;
}

export class AIError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AIError";
  }
}
