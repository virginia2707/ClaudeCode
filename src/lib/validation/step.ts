import { z } from "zod";
import { DIFFICULTIES, VALIDATION_MODES } from "@/lib/constants";
import { PUZZLE_TYPES } from "@/lib/puzzles/types";

const mediaUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^(https?:\/\/|\/api\/files\/)/.test(v), "URL invalide")
  .optional()
  .default("");

export const stepSchema = z.object({
  title: z.string().trim().min(2, "Titre trop court").max(120, "Titre trop long"),
  description: z.string().trim().max(1000, "Description trop longue").default(""),
  instruction: z.string().trim().max(2000, "Consigne trop longue").default(""),
  content: z.string().trim().max(5000, "Contenu trop long").default(""),
  imageUrl: mediaUrl,
  fileUrl: mediaUrl,
  fileName: z.string().trim().max(200).default(""),
  videoUrl: mediaUrl,
  unlockCode: z.string().trim().max(40, "Code trop long").default(""),
  points: z.coerce.number({ error: "Points invalides" }).int().min(0, "Minimum 0").max(10000, "Maximum 10000"),
  recommendedSeconds: z.coerce.number({ error: "Durée invalide" }).int().min(0, "Minimum 0").max(7200, "Maximum 2 heures"),
  difficulty: z.enum(DIFFICULTIES, { error: "Difficulté invalide" }),
  isFinal: z.boolean().default(false),
  successFeedback: z.string().trim().max(1000, "Feedback trop long").default(""),
  errorFeedback: z.string().trim().max(1000, "Feedback trop long").default(""),
  explanation: z.string().trim().max(2000, "Explication trop longue").default(""),
  // Énigme
  puzzleType: z.enum(PUZZLE_TYPES, { error: "Type d'énigme invalide" }),
  prompt: z.string().trim().max(2000, "Énoncé trop long").default(""),
  validationMode: z.enum(VALIDATION_MODES, { error: "Mode de validation invalide" }),
  maxAttempts: z.coerce.number().int().min(0).max(100).optional(),
  caseSensitive: z.boolean().default(false),
  accentSensitive: z.boolean().default(false),
  config: z.string().max(20000).default("{}"),
  answers: z.string().max(20000).default("[]"),
  hints: z.string().max(20000).default("[]"),
  skills: z.string().max(4000).default("[]"),
});
export type StepInput = z.infer<typeof stepSchema>;

export const hintSchema = z.object({
  text: z.string().trim().min(1, "Indice vide").max(500, "Indice trop long"),
  pointCost: z.number().int().min(0).max(1000),
  timeCostSeconds: z.number().int().min(0).max(3600),
});
export const hintsSchema = z.array(hintSchema).max(5, "5 indices maximum par énigme");

export const answersSchema = z.array(z.unknown()).max(20, "20 réponses acceptées maximum");
export const skillNamesSchema = z.array(z.string().trim().min(1).max(80)).max(10, "10 compétences maximum par énigme");
