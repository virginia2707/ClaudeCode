import "server-only";

/**
 * Bus d'événements temps réel en mémoire (une instance). Les clients s'y
 * abonnent via SSE. Pour un déploiement multi-instances, remplacer
 * l'implémentation par Redis Pub/Sub en conservant cette interface.
 */
export type SessionEventName =
  | "player_joined"
  | "player_left"
  | "session_started"
  | "session_paused"
  | "session_resumed"
  | "time_extended"
  | "progress_updated"
  | "leaderboard_updated"
  | "hint_granted"
  | "step_unlocked"
  | "session_ended";

export type SessionEvent = { name: SessionEventName; at: number; payload?: Record<string, unknown> };

type Listener = (event: SessionEvent) => void;

/**
 * Le registre vit sur `globalThis` : les Server Actions et les Route Handlers
 * peuvent être regroupés dans des bundles distincts, chacun avec sa propre
 * instance de module. Sans ce singleton, un événement publié depuis une action
 * n'atteindrait jamais les abonnés SSE du même processus.
 */
const globalForHub = globalThis as unknown as { escapeclassHub?: Map<string, Set<Listener>> };
const listeners: Map<string, Set<Listener>> = globalForHub.escapeclassHub ?? new Map();
globalForHub.escapeclassHub = listeners;

export function subscribe(sessionId: string, listener: Listener): () => void {
  const set = listeners.get(sessionId) ?? new Set<Listener>();
  set.add(listener);
  listeners.set(sessionId, set);
  return () => {
    set.delete(listener);
    if (set.size === 0) listeners.delete(sessionId);
  };
}

export function publish(sessionId: string, name: SessionEventName, payload?: Record<string, unknown>) {
  const set = listeners.get(sessionId);
  if (!set) return;
  const event: SessionEvent = { name, at: Date.now(), payload };
  for (const listener of set) {
    try {
      listener(event);
    } catch (error) {
      console.error("realtime listener failed", error);
    }
  }
}

export function subscriberCount(sessionId: string) {
  return listeners.get(sessionId)?.size ?? 0;
}
