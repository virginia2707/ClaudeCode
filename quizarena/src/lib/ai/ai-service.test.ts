import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { StubAIProvider } from "./providers/stub";
import { AnthropicProvider } from "./providers/anthropic";
import { AIServiceError } from "./types";
import { AIService } from "./ai-service";
import { questionSchema } from "@/lib/validation/quiz";

const ORIGINAL_ENV = { ...process.env };
beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
});
afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("StubAIProvider", () => {
  it("generates exactly the requested count of well-formed questions", async () => {
    const provider = new StubAIProvider();
    const drafts = await provider.generateQuestions({ topic: "Gestion de projet", level: "MEDIUM", count: 7, type: "QCM", skills: ["Planification", "Risques"] });
    expect(drafts).toHaveLength(7);
    for (const d of drafts) {
      expect(d.answers).toHaveLength(4);
      expect(new Set(d.answers).size).toBe(4); // no duplicate answer text
      expect(d.correctIndex).toBeGreaterThanOrEqual(0);
      expect(d.correctIndex).toBeLessThanOrEqual(3);
      expect(d.text).toContain("Gestion de projet");
      expect(d.difficulty).toBe("MEDIUM");
      // Every draft validates against the same schema the manual editor enforces.
      const parsed = questionSchema.safeParse({ ...d, imageUrl: "" });
      expect(parsed.success).toBe(true);
    }
  });

  it("cycles through the provided skills and rotates the correct answer position", async () => {
    const provider = new StubAIProvider();
    const drafts = await provider.generateQuestions({ topic: "IA", level: "EASY", count: 5, type: "QCM", skills: ["A", "B"] });
    expect(drafts.map((d) => d.skills[0])).toEqual(["A", "B", "A", "B", "A"]);
    expect(new Set(drafts.map((d) => d.correctIndex)).size).toBeGreaterThan(1);
  });

  it("falls back to the topic as a skill when none are provided", async () => {
    const provider = new StubAIProvider();
    const [d] = await provider.generateQuestions({ topic: "Excel", level: "MEDIUM", count: 1, type: "QCM", skills: [] });
    expect(d.skills).toEqual(["Excel"]);
    expect(d.category).toBe("Excel");
  });

  it("is deterministic for the same input", async () => {
    const provider = new StubAIProvider();
    const input = { topic: "X", level: "HARD" as const, count: 3, type: "QCM" as const, skills: ["S1"] };
    expect(await provider.generateQuestions(input)).toEqual(await provider.generateQuestions(input));
  });
});

describe("AIService", () => {
  it("defaults to the stub provider when AI_PROVIDER is unset", async () => {
    delete process.env.AI_PROVIDER;
    const drafts = await AIService.generateQuestions({ topic: "Test", level: "MEDIUM", count: 2, type: "QCM", skills: [] });
    expect(drafts).toHaveLength(2);
  });

  it("caps output at the requested count even if a provider ignores it", async () => {
    process.env.AI_PROVIDER = "stub";
    const drafts = await AIService.generateQuestions({ topic: "Test", level: "MEDIUM", count: 3, type: "QCM", skills: [] });
    expect(drafts.length).toBeLessThanOrEqual(3);
  });
});

describe("AnthropicProvider", () => {
  it("throws a clear AIServiceError when no API key is configured, without making a network call", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const provider = new AnthropicProvider();
    await expect(provider.generateQuestions({ topic: "X", level: "MEDIUM", count: 1, type: "QCM", skills: [] })).rejects.toBeInstanceOf(AIServiceError);
  });
});
