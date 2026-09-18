import type { AIContext, AIProvider } from "@/lib/ai/types";
import { DEFAULT_PRIVACY_POLICY, redactPII } from "@/lib/ai/privacy";

// AIService = façade unique. Elle applique la politique de confidentialité,
// choisit le fournisseur et (phases 16-18) journalise chaque appel en AIJob.
// Les appelants n'importent jamais un SDK fournisseur directement.

export class AINotConfiguredError extends Error {
  constructor() {
    super("AI_NOT_CONFIGURED");
  }
}

/** Fournisseur par défaut tant qu'aucun n'est configuré (phase 16). */
export class NotConfiguredProvider implements AIProvider {
  readonly name = "not-configured";
  private fail(): never {
    throw new AINotConfiguredError();
  }
  analyzeCourse(): never { return this.fail(); }
  generateMission(): never { return this.fail(); }
  generateScenario(): never { return this.fail(); }
  generateSteps(): never { return this.fail(); }
  generateDecision(): never { return this.fail(); }
  generateFeedback(): never { return this.fail(); }
  evaluateDeliverable(): never { return this.fail(); }
  generateCoachResponse(): never { return this.fail(); }
  generateLearningReport(): never { return this.fail(); }
}

export class AIService {
  constructor(private readonly provider: AIProvider) {}

  get providerName() {
    return this.provider.name;
  }

  /** Point unique de nettoyage du texte libre avant envoi externe. */
  protected sanitize(text: string) {
    const redacted = redactPII(text);
    return redacted.length > DEFAULT_PRIVACY_POLICY.maxContextChars
      ? redacted.slice(0, DEFAULT_PRIVACY_POLICY.maxContextChars)
      : redacted;
  }

  analyzeCourse(input: Parameters<AIProvider["analyzeCourse"]>[0], ctx: AIContext) {
    return this.provider.analyzeCourse({ ...input, content: this.sanitize(input.content) }, ctx);
  }
  generateMission(input: Parameters<AIProvider["generateMission"]>[0], ctx: AIContext) {
    return this.provider.generateMission({ ...input, courseContent: this.sanitize(input.courseContent) }, ctx);
  }
  generateScenario(input: Parameters<AIProvider["generateScenario"]>[0], ctx: AIContext) {
    return this.provider.generateScenario({ ...input, courseContent: this.sanitize(input.courseContent) }, ctx);
  }
  generateSteps(input: Parameters<AIProvider["generateSteps"]>[0], ctx: AIContext) {
    return this.provider.generateSteps({ ...input, courseContent: this.sanitize(input.courseContent) }, ctx);
  }
  generateDecision(input: Parameters<AIProvider["generateDecision"]>[0], ctx: AIContext) {
    return this.provider.generateDecision(input, ctx);
  }
  generateFeedback(input: Parameters<AIProvider["generateFeedback"]>[0], ctx: AIContext) {
    return this.provider.generateFeedback({ ...input, learnerOutput: this.sanitize(input.learnerOutput) }, ctx);
  }
  evaluateDeliverable(input: Parameters<AIProvider["evaluateDeliverable"]>[0], ctx: AIContext) {
    return this.provider.evaluateDeliverable({ ...input, submissionText: this.sanitize(input.submissionText) }, ctx);
  }
  generateCoachResponse(input: Parameters<AIProvider["generateCoachResponse"]>[0], ctx: AIContext) {
    return this.provider.generateCoachResponse({ ...input, question: this.sanitize(input.question) }, ctx);
  }
  generateLearningReport(input: Parameters<AIProvider["generateLearningReport"]>[0], ctx: AIContext) {
    return this.provider.generateLearningReport(input, ctx);
  }
}

let singleton: AIService | null = null;

/** Résolution du fournisseur depuis l'environnement. Étendue en phase 16. */
export function getAIService(): AIService {
  if (singleton) return singleton;
  singleton = new AIService(new NotConfiguredProvider());
  return singleton;
}
