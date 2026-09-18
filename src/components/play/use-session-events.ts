"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Abonnement SSE aux événements d'une session, avec repli par sondage si le
 * flux est indisponible. À chaque événement, on redemande l'état complet au
 * serveur : le client ne calcule jamais l'état du jeu lui-même.
 */
export function useSessionEvents(sessionId: string, onEvent: () => void, { pollMs = 5000 }: { pollMs?: number } = {}) {
  const [connected, setConnected] = useState(false);
  const handler = useRef(onEvent);
  // Garde la dernière fonction sans recréer l'abonnement SSE à chaque rendu.
  useEffect(() => {
    handler.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    let source: EventSource | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;
    let closed = false;

    const startPolling = () => {
      if (poll) return;
      poll = setInterval(() => handler.current(), pollMs);
    };
    const stopPolling = () => {
      if (poll) clearInterval(poll);
      poll = null;
    };

    try {
      source = new EventSource(`/api/sessions/${sessionId}/events`);
      source.onopen = () => {
        if (closed) return;
        setConnected(true);
        stopPolling();
      };
      source.onerror = () => {
        if (closed) return;
        setConnected(false);
        // EventSource se reconnecte seul ; en attendant, on sonde.
        startPolling();
      };
      const refresh = () => handler.current();
      for (const name of [
        "session_started",
        "session_paused",
        "session_resumed",
        "time_extended",
        "progress_updated",
        "leaderboard_updated",
        "hint_granted",
        "step_unlocked",
        "session_ended",
        "player_joined",
        "player_left",
      ]) {
        source.addEventListener(name, refresh);
      }
    } catch {
      startPolling();
    }

    // Filet de sécurité : une resynchronisation régulière même en SSE.
    const safety = setInterval(() => handler.current(), 30000);
    const onVisible = () => {
      if (document.visibilityState === "visible") handler.current();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      closed = true;
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(safety);
      stopPolling();
      source?.close();
    };
  }, [sessionId, pollMs]);

  return { connected };
}
