import "server-only";
import { prisma } from "@/lib/prisma";
import type { AnalyticsEventPayload } from "@/lib/analytics/events";

/**
 * Enregistre un événement produit. Persisté en base : les tableaux de bord
 * (phase 15) s'appuient dessus, et l'organisation garde la propriété de ses
 * données. Un adaptateur externe (PostHog…) pourra être ajouté ici sans
 * toucher aux appelants.
 *
 * Le suivi ne doit jamais faire échouer l'action métier : une erreur
 * d'écriture est journalisée, pas propagée.
 */
export async function track(event: AnalyticsEventPayload) {
  try {
    await prisma.analyticsEvent.create({
      data: {
        name: event.name,
        organizationId: event.organizationId ?? null,
        userId: event.userId ?? null,
        sessionId: event.sessionId ?? null,
        progressId: event.progressId ?? null,
        missionId: event.missionId ?? null,
        propertiesJson: JSON.stringify(event.properties ?? {}),
      },
    });
  } catch (error) {
    console.error("[analytics] échec d'enregistrement", event.name, error);
  }
}
