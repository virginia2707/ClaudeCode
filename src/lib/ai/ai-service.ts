import "server-only";
import { prisma } from "@/lib/prisma";
import { StubAIProvider } from "@/lib/ai/stub-provider";
import { AnthropicAIProvider } from "@/lib/ai/anthropic-provider";
import { AIError, type AIProvider, type GeneratedGame, type GenerationRequest } from "@/lib/ai/types";

/**
 * Service d'IA : choisit le fournisseur, journalise chaque tâche (AIJob) et
 * renvoie une proposition. Le contenu généré n'est JAMAIS publié
 * automatiquement : il atterrit toujours dans un brouillon relu par le formateur.
 */
function resolveProvider(): AIProvider {
  const configured = (process.env.AI_PROVIDER ?? "stub").toLowerCase();
  if (configured === "anthropic") {
    const provider = new AnthropicAIProvider();
    if (provider.isAvailable()) return provider;
    console.warn("AI_PROVIDER=anthropic mais ANTHROPIC_API_KEY est absente : repli sur le fournisseur hors-ligne.");
  }
  return new StubAIProvider();
}

export function currentProviderName() {
  return resolveProvider().name;
}

export async function generateGameDraft(ownerId: string, request: GenerationRequest): Promise<{ job: { id: string }; game: GeneratedGame }> {
  const provider = resolveProvider();
  const job = await prisma.aIJob.create({
    data: { ownerId, type: "GENERATE_GAME", status: "RUNNING", provider: provider.name, input: JSON.stringify(request) },
    select: { id: true },
  });

  try {
    const game = await provider.generateGame(request);
    await prisma.aIJob.update({ where: { id: job.id }, data: { status: "DONE", output: JSON.stringify(game) } });
    return { job, game };
  } catch (error) {
    const message = error instanceof AIError ? error.message : "Échec de la génération.";
    await prisma.aIJob.update({ where: { id: job.id }, data: { status: "FAILED", error: message } });
    throw error instanceof AIError ? error : new AIError(message, error);
  }
}
