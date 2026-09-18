import "server-only";
import { prisma } from "@/lib/db/prisma";
import type { AnalyticsEventType } from "@/lib/constants";

/**
 * Product analytics. Payloads must never contain personal data (no emails,
 * no nicknames): only ids, counts and enum-like values.
 */
export async function track(
  type: AnalyticsEventType,
  data: { userId?: string | null; gameId?: string | null; payload?: Record<string, string | number | boolean | null> } = {},
): Promise<void> {
  try {
    await prisma.analyticsEvent.create({
      data: {
        type,
        userId: data.userId ?? null,
        gameId: data.gameId ?? null,
        payload: JSON.stringify(data.payload ?? {}),
      },
    });
  } catch (err) {
    // Analytics must never break a user flow.
    console.error("[analytics] failed to record", type, err);
  }
}
