import "server-only";
import type { AIProvider, GenerateQuestionsInput, GeneratedQuestion } from "./types";
import { StubAIProvider } from "./providers/stub";
import { AnthropicProvider } from "./providers/anthropic";

/**
 * The single entry point the rest of the app talks to. Swapping or adding a
 * provider only touches this file — callers depend on `AIProvider`, never on
 * a specific vendor.
 */
function resolveProvider(): AIProvider {
  const requested = (process.env.AI_PROVIDER || "stub").toLowerCase();
  switch (requested) {
    case "anthropic":
      return new AnthropicProvider();
    case "stub":
    default:
      return new StubAIProvider();
  }
}

export const AIService = {
  async generateQuestions(input: GenerateQuestionsInput): Promise<GeneratedQuestion[]> {
    const provider = resolveProvider();
    const questions = await provider.generateQuestions(input);
    // Cap defensively even if a provider ignores `count`.
    return questions.slice(0, input.count);
  },
};
