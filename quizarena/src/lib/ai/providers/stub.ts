import type { AIProvider, GenerateQuestionsInput, GeneratedQuestion } from "../types";

/**
 * Deterministic, offline provider. No API key, no network call, no cost —
 * used by default (AI_PROVIDER=stub) and in tests. It produces syntactically
 * valid, immediately editable draft questions from the trainer's topic and
 * skills; it is not a substitute for a real LLM's subject-matter knowledge,
 * which is exactly why generated content is always reviewed before it is
 * added to a quiz, and never published automatically.
 */
export class StubAIProvider implements AIProvider {
  readonly name = "stub";

  async generateQuestions(input: GenerateQuestionsInput): Promise<GeneratedQuestion[]> {
    const topic = input.topic.trim() || "ce sujet";
    const skillPool = input.skills.length ? input.skills : [topic];
    const out: GeneratedQuestion[] = [];
    for (let i = 0; i < input.count; i++) {
      const skill = skillPool[i % skillPool.length];
      const correctIndex = i % 4;
      const answers: [string, string, string, string] = ["", "", "", ""];
      answers[correctIndex] = `Une pratique correcte concernant « ${skill} » dans le cadre de « ${topic} ».`;
      const distractors = [
        `Une confusion fréquente au sujet de « ${skill} ».`,
        `Une affirmation qui ne s'applique pas à « ${topic} ».`,
        `Une pratique déconseillée liée à « ${skill} ».`,
      ];
      let d = 0;
      for (let a = 0; a < 4; a++) {
        if (a !== correctIndex) answers[a] = distractors[d++];
      }
      out.push({
        text: `À propos de « ${topic} », quelle proposition concernant « ${skill} » est correcte ? (question ${i + 1} — brouillon à relire)`,
        answers,
        correctIndex,
        explanation: `Cette question porte sur « ${skill} », une notion clé de « ${topic} ». Relisez et complétez cette explication avant publication.`,
        difficulty: input.level,
        timeLimit: 20,
        points: 500,
        category: topic,
        skills: [skill],
      });
    }
    return out;
  }
}
