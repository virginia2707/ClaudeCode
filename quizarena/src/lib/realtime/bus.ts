import type { GameEvent } from "./events";

/**
 * Pub/sub bus for live game events. The MVP implementation is in-memory
 * (single Node process). To scale horizontally, implement this interface on
 * top of Redis Pub/Sub and swap `getBus()`.
 */
export interface RealtimeBus {
  publish(gameId: string, event: GameEvent): void;
  subscribe(gameId: string, listener: (event: GameEvent) => void): () => void;
  subscriberCount(gameId: string): number;
}

class MemoryBus implements RealtimeBus {
  private channels = new Map<string, Set<(event: GameEvent) => void>>();

  publish(gameId: string, event: GameEvent) {
    const listeners = this.channels.get(gameId);
    if (!listeners) return;
    for (const l of listeners) {
      try {
        l(event);
      } catch (err) {
        console.error("[realtime] listener failed", err);
      }
    }
  }

  subscribe(gameId: string, listener: (event: GameEvent) => void) {
    let set = this.channels.get(gameId);
    if (!set) {
      set = new Set();
      this.channels.set(gameId, set);
    }
    set.add(listener);
    return () => {
      set?.delete(listener);
      if (set && set.size === 0) this.channels.delete(gameId);
    };
  }

  subscriberCount(gameId: string) {
    return this.channels.get(gameId)?.size ?? 0;
  }
}

// Survive Next.js dev HMR by hanging the singleton off globalThis.
const g = globalThis as unknown as { __qaBus?: RealtimeBus };
export function getBus(): RealtimeBus {
  if (!g.__qaBus) g.__qaBus = new MemoryBus();
  return g.__qaBus;
}
