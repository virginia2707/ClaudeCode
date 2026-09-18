import "server-only";

/**
 * AIService — the single seam between The Apprentice and any LLM provider.
 *
 * Nothing outside this file should know which provider is in use, and no
 * API key is ever sent to the browser: every call here runs server-side
 * (server actions / route handlers only).
 *
 * The MVP ships with a deterministic StubAIProvider so the product works
 * fully offline and with zero API cost. Swap it for a real provider by
 * implementing AIProvider and wiring it up in `getAIProvider()` — driven by
 * the AI_PROVIDER env var so no call site has to change.
 */

export interface SimulationDraftInput {
  job: string;
  level: string;
  durationDays: number;
  skills: string[];
  context: string;
}

export interface SimulationDraftMission {
  dayNumber: number;
  title: string;
  description: string;
  objective: string;
}

export interface SimulationDraft {
  title: string;
  company: string;
  description: string;
  missions: SimulationDraftMission[];
}

export interface CoachHintInput {
  situationTitle: string;
  situationDescription: string;
  skillsInvolved: string[];
}

export interface CoachFeedbackInput {
  situationDescription: string;
  choiceText: string;
  outcomeText: string;
}

export interface PerformanceSummaryInput {
  simulationTitle: string;
  globalScore: number;
  skills: { name: string; score: number }[];
}

export interface AIProvider {
  generateSimulationDraft(input: SimulationDraftInput): Promise<SimulationDraft>;
  getCoachHint(input: CoachHintInput): Promise<string>;
  getCoachFeedback(input: CoachFeedbackInput): Promise<string>;
  generatePerformanceSummary(input: PerformanceSummaryInput): Promise<{
    strengths: string[];
    improvements: string[];
    recommendation: string;
  }>;
}

/** Deterministic, template-based provider — no network call, no API key. */
class StubAIProvider implements AIProvider {
  async generateSimulationDraft(input: SimulationDraftInput): Promise<SimulationDraft> {
    const missions: SimulationDraftMission[] = Array.from({ length: input.durationDays }, (_, i) => ({
      dayNumber: i + 1,
      title: `Jour ${i + 1}`,
      description: `Une situation professionnelle typique du métier "${input.job}", mobilisant notamment ${
        input.skills[i % Math.max(input.skills.length, 1)] ?? "les compétences clés"
      }.`,
      objective: `Prendre les meilleures décisions possibles face à la situation du jour ${i + 1}.`,
    }));

    return {
      title: `${input.job} — Simulation`,
      company: "Entreprise Fictive SA",
      description: `Simulation générée pour le métier "${input.job}" (niveau ${input.level}) sur ${input.durationDays} jours. Contexte : ${input.context}`,
      missions,
    };
  }

  async getCoachHint(input: CoachHintInput): Promise<string> {
    return `Avant de décider, demandez-vous : quel est l'enjeu le plus urgent dans "${input.situationTitle}" ? Pensez aux compétences suivantes : ${input.skillsInvolved.join(", ")}.`;
  }

  async getCoachFeedback(input: CoachFeedbackInput): Promise<string> {
    return `Vous avez choisi : « ${input.choiceText} ». Résultat : ${input.outcomeText} Cette décision illustre l'importance de bien évaluer le contexte avant d'agir.`;
  }

  async generatePerformanceSummary(input: PerformanceSummaryInput) {
    const sorted = [...input.skills].sort((a, b) => b.score - a.score);
    const strengths = sorted.slice(0, Math.min(3, sorted.length)).map((s) => s.name);
    const improvements = sorted.slice(-Math.min(3, sorted.length)).map((s) => s.name);
    return {
      strengths,
      improvements,
      recommendation: `Votre simulation "${input.simulationTitle}" montre un score global de ${input.globalScore}/100. Vos points forts (${strengths.join(
        ", "
      )}) pourraient être mis à profit dans des situations similaires, tandis qu'un travail ciblé sur (${improvements.join(
        ", "
      )}) renforcerait votre profil professionnel simulé.`,
    };
  }
}

let cachedProvider: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (cachedProvider) return cachedProvider;
  // Future providers (Anthropic, OpenAI, ...) plug in here based on
  // process.env.AI_PROVIDER, keeping every call site provider-agnostic.
  cachedProvider = new StubAIProvider();
  return cachedProvider;
}
