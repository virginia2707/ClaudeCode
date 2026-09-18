"use server";

import { revalidatePath } from "next/cache";
import { requireTrainer } from "@/lib/auth/session";
import { getOwnedQuiz } from "@/lib/quiz/access";
import { writeQuestion } from "@/lib/quiz/write";
import { AIService } from "@/lib/ai/ai-service";
import { AIServiceError } from "@/lib/ai/types";
import type { GeneratedQuestion } from "@/lib/ai/types";
import { generateQuestionsSchema } from "@/lib/validation/ai";
import { questionSchema } from "@/lib/validation/quiz";
import { fieldErrorsFrom, type ActionState } from "@/lib/action-state";
import { PLAN_LIMITS, type Plan } from "@/lib/constants";

export type GenerateState = ActionState & { drafts?: GeneratedQuestion[] };

/**
 * Generates draft questions with AIService. Nothing is persisted here: the
 * trainer reviews and edits every draft in the UI before any is added to the
 * quiz (see addGeneratedQuestionAction).
 */
export async function generateQuestionsAction(_prev: GenerateState, formData: FormData): Promise<GenerateState> {
  const user = await requireTrainer();
  if (!PLAN_LIMITS[user.plan as Plan]?.ai) {
    return { error: `La génération par IA n'est pas incluse dans votre plan ${user.plan}.` };
  }
  const raw = {
    topic: String(formData.get("topic") ?? ""),
    level: String(formData.get("level") ?? "MEDIUM"),
    count: String(formData.get("count") ?? "5"),
    skills: String(formData.get("skills") ?? ""),
  };
  const parsed = generateQuestionsSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues), values: raw };

  try {
    const drafts = await AIService.generateQuestions({ ...parsed.data, type: "QCM" });
    if (drafts.length === 0) return { error: "Aucune question n'a pu être générée. Réessayez avec un autre sujet.", values: raw };
    return { ok: true, drafts, values: raw };
  } catch (err) {
    if (err instanceof AIServiceError) return { error: err.message, values: raw };
    console.error("[ai] generation failed", err);
    return { error: "La génération a échoué. Réessayez.", values: raw };
  }
}

function draftFromForm(formData: FormData) {
  return {
    text: String(formData.get("text") ?? ""),
    imageUrl: "",
    answers: [0, 1, 2, 3].map((i) => String(formData.get(`answer_${i}`) ?? "")),
    correctIndex: String(formData.get("correctIndex") ?? ""),
    explanation: String(formData.get("explanation") ?? ""),
    difficulty: String(formData.get("difficulty") ?? "MEDIUM"),
    timeLimit: String(formData.get("timeLimit") ?? "20"),
    points: String(formData.get("points") ?? "500"),
    category: String(formData.get("category") ?? ""),
    skills: String(formData.get("skills") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  };
}

/**
 * Persists one reviewed (and possibly edited) draft as a real question on the
 * quiz. Goes through the exact same validation as the manual question editor.
 */
export async function addGeneratedQuestionAction(quizId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireTrainer();
  const quiz = await getOwnedQuiz(quizId, user);
  const raw = draftFromForm(formData);
  const parsed = questionSchema.safeParse(raw);
  if (!parsed.success) {
    const fe = fieldErrorsFrom(parsed.error.issues);
    for (const k of Object.keys(fe)) {
      const m = /^answers\.(\d)$/.exec(k);
      if (m) {
        fe[`answer_${m[1]}`] = fe[k];
        delete fe[k];
      }
    }
    return { fieldErrors: fe };
  }
  const order = quiz.questions.length ? Math.max(...quiz.questions.map((q) => q.order)) + 1 : 0;
  await writeQuestion({ quizId, ownerId: quiz.ownerId, questionId: null, order, data: parsed.data });
  revalidatePath(`/quizzes/${quizId}`);
  return { ok: true };
}
