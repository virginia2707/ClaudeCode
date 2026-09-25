import { z } from "zod";
import { DIFFICULTIES, GAME_MODES, JOKER_TYPES } from "@/lib/constants";

/** Gameplay settings stored as JSON on Quiz.settings and snapshotted on Game.settings. */
export const quizSettingsSchema = z.object({
  // Scoring
  timePerQuestion: z.coerce.number().int().min(5).max(300).default(20),
  basePoints: z.coerce.number().int().min(0).max(10_000).default(500),
  maxSpeedBonus: z.coerce.number().int().min(0).max(10_000).default(500),
  /** 0 → accuracy only, 1 → full speed bonus. */
  speedWeight: z.coerce.number().min(0).max(1).default(1),
  streakEnabled: z.coerce.boolean().default(true),
  streakBonuses: z.array(z.coerce.number().int().min(0).max(10_000)).min(1).max(10).default([0, 50, 100, 150, 250]),
  wrongAnswerPenalty: z.coerce.number().int().min(0).max(10_000).default(0),
  lateToleranceMs: z.coerce.number().int().min(0).max(5000).default(750),
  // Pedagogy / display
  feedbackEnabled: z.coerce.boolean().default(true),
  showExplanation: z.coerce.boolean().default(true),
  showLeaderboard: z.coerce.boolean().default(true),
  showAnswerDistribution: z.coerce.boolean().default(true),
  shuffleAnswers: z.coerce.boolean().default(false),
  soundsEnabled: z.coerce.boolean().default(false),
  // Jokers
  jokersEnabled: z.coerce.boolean().default(true),
  jokers: z
    .object({
      FIFTY_FIFTY: z.coerce.number().int().min(0).max(5).default(1),
      DOUBLE_POINTS: z.coerce.number().int().min(0).max(5).default(1),
      EXTRA_TIME: z.coerce.number().int().min(0).max(5).default(1),
      SECOND_CHANCE: z.coerce.number().int().min(0).max(5).default(1),
    })
    .default({ FIFTY_FIFTY: 1, DOUBLE_POINTS: 1, EXTRA_TIME: 1, SECOND_CHANCE: 1 }),
  extraTimeSeconds: z.coerce.number().int().min(1).max(60).default(10),
  // Mode
  mode: z.enum(GAME_MODES).default("INDIVIDUAL"),
  teamNames: z.array(z.string().trim().min(1).max(30)).max(12).default(["Team Alpha", "Team Bravo", "Team Phoenix", "Team Titan"]),
});

export type QuizSettings = z.infer<typeof quizSettingsSchema>;
export const DEFAULT_QUIZ_SETTINGS: QuizSettings = quizSettingsSchema.parse({});

/** Parse stored JSON settings, filling in defaults for missing keys. */
export function parseSettings(raw: string | null | undefined): QuizSettings {
  let obj: unknown = {};
  try {
    obj = raw ? JSON.parse(raw) : {};
  } catch {
    obj = {};
  }
  const result = quizSettingsSchema.safeParse(obj);
  return result.success ? result.data : DEFAULT_QUIZ_SETTINGS;
}

export const quizMetaSchema = z.object({
  title: z.string().trim().min(3, "3 caractères minimum").max(120, "120 caractères maximum"),
  description: z.string().trim().max(1000, "1000 caractères maximum").default(""),
  category: z.string().trim().max(60, "60 caractères maximum").default(""),
  level: z.enum(DIFFICULTIES).default("MEDIUM"),
});
export type QuizMetaInput = z.infer<typeof quizMetaSchema>;

export const answerInputSchema = z.string().trim().min(1, "Réponse requise").max(300, "300 caractères maximum");

export const questionSchema = z
  .object({
    text: z.string().trim().min(5, "5 caractères minimum").max(600, "600 caractères maximum"),
    imageUrl: z
      .string()
      .trim()
      .max(500)
      .refine((v) => v === "" || /^https?:\/\//.test(v), "URL http(s) attendue")
      .default(""),
    // The image carries pedagogical content, never decorative: an alt text is
    // required whenever an image is attached (enforced by the refine below).
    imageAlt: z.string().trim().max(300, "300 caractères maximum").default(""),
    answers: z.tuple([answerInputSchema, answerInputSchema, answerInputSchema, answerInputSchema]),
    correctIndex: z.coerce.number().int().min(0).max(3),
    explanation: z.string().trim().max(1000, "1000 caractères maximum").default(""),
    difficulty: z.enum(DIFFICULTIES).default("MEDIUM"),
    timeLimit: z.coerce.number().int().min(5, "5 s minimum").max(300, "300 s maximum").default(20),
    points: z.coerce.number().int().min(0).max(10_000).default(500),
    category: z.string().trim().max(60).default(""),
    skills: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
  })
  .refine((d) => d.imageUrl === "" || d.imageAlt !== "", {
    message: "Texte alternatif requis lorsqu'une image est ajoutée (accessibilité).",
    path: ["imageAlt"],
  });
export type QuestionInput = z.infer<typeof questionSchema>;

export const JOKER_KEYS = JOKER_TYPES;
