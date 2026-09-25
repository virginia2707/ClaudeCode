import "server-only";
import { AIError, generatedGameSchema, type AIProvider, type GeneratedGame, type GenerationRequest } from "@/lib/ai/types";
import { LEVEL_LABELS, type Level } from "@/lib/constants";

/**
 * Fournisseur Anthropic. Activé par AI_PROVIDER="anthropic" + ANTHROPIC_API_KEY.
 * Le SDK est importé dynamiquement : l'application démarre et fonctionne sans
 * lui (le fournisseur par défaut reste le stub hors-ligne).
 */
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5";

const SYSTEM_PROMPT = `Tu es ingénieur pédagogique, spécialiste de la formation professionnelle pour adultes.
Tu conçois des escape games pédagogiques : chaque étape est un problème professionnel réaliste, relié à une compétence précise.

Règles impératives :
- Le scénario est une situation de travail crédible, pas un univers fantastique.
- Chaque étape porte exactement une compétence et une énigme dont la réponse est vérifiable sans ambiguïté.
- Les réponses attendues sont courtes et normalisables (un nombre, un mot, une expression).
- Les indices vont du plus général au plus précis et ne donnent jamais la réponse.
- Le feedback d'erreur oriente la recherche sans révéler la solution.
- La dernière étape est la mission finale.
- Tu écris en français professionnel, sans emphase ni superlatifs.`;

export class AnthropicAIProvider implements AIProvider {
  readonly name = "anthropic";

  isAvailable() {
    return Boolean(process.env.ANTHROPIC_API_KEY);
  }

  async generateGame(request: GenerationRequest): Promise<GeneratedGame> {
    if (!this.isAvailable()) {
      throw new AIError("Le fournisseur Anthropic n'est pas configuré (ANTHROPIC_API_KEY manquante).");
    }

    const [{ default: Anthropic }, { zodOutputFormat }] = await Promise.all([
      import("@anthropic-ai/sdk"),
      import("@anthropic-ai/sdk/helpers/zod"),
    ]).catch((error) => {
      throw new AIError("Le SDK @anthropic-ai/sdk n'est pas installé.", error);
    });

    const client = new Anthropic();
    const userPrompt = buildUserPrompt(request);

    try {
      const response = await client.messages.parse({
        model: MODEL,
        max_tokens: 16000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
        output_config: { format: zodOutputFormat(generatedGameSchema) },
      });

      if (response.stop_reason === "refusal") {
        throw new AIError("La génération a été refusée par le modèle. Reformulez le sujet.");
      }
      if (!response.parsed_output) {
        throw new AIError("La réponse du modèle n'a pas pu être interprétée.");
      }
      return generatedGameSchema.parse(response.parsed_output);
    } catch (error) {
      if (error instanceof AIError) throw error;
      throw new AIError(describeError(error), error);
    }
  }
}

function buildUserPrompt(request: GenerationRequest) {
  return [
    `Sujet : ${request.subject}`,
    `Niveau : ${LEVEL_LABELS[request.level as Level] ?? request.level}`,
    `Durée cible : ${request.durationMinutes} minutes`,
    `Nombre d'étapes : exactement ${request.stepCount}`,
    request.objectives ? `Objectifs et compétences à couvrir : ${request.objectives}` : "",
    request.audience ? `Public : ${request.audience}` : "",
    "",
    "Produis un escape game complet respectant ces contraintes.",
    "Pour une énigme de type MCQ, remplis `choices` et `correctChoiceIndexes`.",
    "Pour les autres types, remplis `answers` avec les réponses acceptées et laisse `choices` vide.",
    "Répartis le temps entre les étapes de façon cohérente avec la durée cible.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Messages d'erreur lisibles à partir des exceptions typées du SDK. */
function describeError(error: unknown): string {
  const status = (error as { status?: number })?.status;
  switch (status) {
    case 401:
      return "Clé d'API Anthropic invalide.";
    case 429:
      return "Limite de débit atteinte chez le fournisseur d'IA. Réessayez dans quelques instants.";
    case 400:
      return "Requête refusée par le fournisseur d'IA. Réduisez le nombre d'étapes ou reformulez le sujet.";
    default:
      if (typeof status === "number" && status >= 500) return "Le fournisseur d'IA est momentanément indisponible.";
      return error instanceof Error ? `Échec de la génération : ${error.message}` : "Échec de la génération.";
  }
}
