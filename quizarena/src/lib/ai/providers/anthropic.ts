import "server-only";
import { z } from "zod";
import { DIFFICULTIES } from "@/lib/constants";
import { AIServiceError, type AIProvider, type GenerateQuestionsInput, type GeneratedQuestion } from "../types";

const generatedQuestionSchema = z.object({
  text: z.string().min(5).max(600),
  answers: z.tuple([z.string().min(1).max(300), z.string().min(1).max(300), z.string().min(1).max(300), z.string().min(1).max(300)]),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().max(1000).default(""),
  category: z.string().max(60).default(""),
  skills: z.array(z.string().max(40)).max(10).default([]),
});

function buildPrompt(input: GenerateQuestionsInput): string {
  return [
    `Génère ${input.count} questions à choix multiples (QCM) en français, niveau "${input.level}", sur le sujet suivant : "${input.topic}".`,
    input.skills.length ? `Chaque question doit être associée à l'une de ces compétences : ${input.skills.join(", ")}.` : "",
    "Contraintes strictes :",
    "- Exactement 4 réponses par question, une seule correcte.",
    "- Les 3 distracteurs doivent être plausibles mais clairement faux pour un expert du sujet.",
    "- Fournis une courte explication pédagogique de la bonne réponse.",
    "- N'invente pas de faits douteux ; si une notion est incertaine, formule une question sur un aspect consensuel du sujet.",
    'Réponds UNIQUEMENT avec un tableau JSON valide, sans texte autour, au format : ',
    '[{"text": "...", "answers": ["...", "...", "...", "..."], "correctIndex": 0, "explanation": "...", "category": "...", "skills": ["..."]}]',
  ]
    .filter(Boolean)
    .join("\n");
}

function extractJsonArray(raw: string): unknown {
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) throw new AIServiceError("Réponse du fournisseur IA illisible (JSON introuvable).");
  return JSON.parse(raw.slice(start, end + 1));
}

/**
 * Calls the Claude Messages API directly (no SDK dependency). The API key is
 * read from the server-only environment and never sent to the client. Output
 * is strictly validated before being handed back — a provider's raw output is
 * never trusted as-is, on top of the trainer's own mandatory review.
 */
export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";

  async generateQuestions(input: GenerateQuestionsInput): Promise<GeneratedQuestion[]> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new AIServiceError("AI_PROVIDER=anthropic mais ANTHROPIC_API_KEY n'est pas configurée côté serveur.");
    }
    const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

    let res: Response;
    try {
      res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          messages: [{ role: "user", content: buildPrompt(input) }],
        }),
      });
    } catch (err) {
      throw new AIServiceError(`Impossible de joindre le fournisseur IA : ${err instanceof Error ? err.message : String(err)}`);
    }
    if (!res.ok) {
      throw new AIServiceError(`Le fournisseur IA a répondu avec une erreur (${res.status}).`);
    }
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = data.content?.find((b) => b.type === "text")?.text;
    if (!text) throw new AIServiceError("Réponse du fournisseur IA vide.");

    const parsed = z.array(generatedQuestionSchema).safeParse(extractJsonArray(text));
    if (!parsed.success) throw new AIServiceError("Le format des questions générées est invalide.");

    return parsed.data.map((q) => ({
      text: q.text,
      answers: q.answers,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      difficulty: DIFFICULTIES.includes(input.level) ? input.level : "MEDIUM",
      timeLimit: 20,
      points: 500,
      category: q.category || input.topic,
      skills: q.skills.length ? q.skills : input.skills.slice(0, 1),
    }));
  }
}
