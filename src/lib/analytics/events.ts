// Événements produit. Persistés dans AnalyticsEvent (base) ; un adaptateur
// externe (PostHog, Plausible…) peut être branché plus tard dans `track()`.

export const ANALYTICS_EVENTS = [
  "mission_created",
  "mission_generated",
  "mission_published",
  "mission_started",
  "step_started",
  "resource_opened",
  "decision_submitted",
  "decision_completed",
  "deliverable_submitted",
  "feedback_viewed",
  "mission_completed",
  "mission_abandoned",
  "coach_used",
] as const;
export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

export type AnalyticsEventPayload = {
  name: AnalyticsEventName;
  organizationId?: string;
  userId?: string;
  sessionId?: string;
  missionId?: string;
  progressId?: string;
  properties?: Record<string, string | number | boolean | null>;
};

export function isAnalyticsEvent(name: string): name is AnalyticsEventName {
  return (ANALYTICS_EVENTS as readonly string[]).includes(name);
}
