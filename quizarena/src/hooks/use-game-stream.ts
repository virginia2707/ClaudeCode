"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GameEvent, GameStatePublic } from "@/lib/realtime/events";

export type ConnectionStatus = "connecting" | "live" | "polling" | "offline";

/** Apply an incremental event to the last known state. */
export function reduceGameState(state: GameStatePublic | null, event: GameEvent): GameStatePublic | null {
  switch (event.type) {
    case "snapshot":
      return event.state;
    case "heartbeat":
      return state ? { ...state, serverTime: event.serverTime } : state;
    case "players":
      return state ? { ...state, players: event.players, teams: event.teams, answeredCount: event.players.filter((p) => p.answered).length } : state;
    case "question_started":
      return state
        ? { ...state, status: "QUESTION", question: event.question, reveal: null, currentIndex: event.currentIndex, players: event.players, answeredCount: 0, serverTime: event.serverTime }
        : state;
    case "answer_count":
      return state
        ? { ...state, answeredCount: event.answeredCount, players: state.players.map((p) => (p.id === event.playerId ? { ...p, answered: true } : p)) }
        : state;
    case "question_ended":
      return state ? { ...state, status: "REVEAL", reveal: event.reveal, players: event.players, teams: event.teams } : state;
    case "leaderboard":
      return state ? { ...state, status: "LEADERBOARD", players: event.players, teams: event.teams } : state;
    case "paused":
      return state ? { ...state, status: "PAUSED" } : state;
    case "resumed":
      return state ? { ...state, status: event.question ? "QUESTION" : state.status, question: event.question ?? state.question, serverTime: event.serverTime } : state;
    case "game_finished":
      return state ? { ...state, status: "FINISHED", question: null, reveal: null } : state;
    default:
      return state;
  }
}

/**
 * Subscribes to a game's SSE stream, with automatic reconnection and a polling
 * fallback. Also tracks the server/client clock offset so countdowns use the
 * server's deadline rather than the local clock.
 */
export function useGameStream(gameId: string, initial: GameStatePublic | null) {
  const [state, setState] = useState<GameStatePublic | null>(initial);
  const [connection, setConnection] = useState<ConnectionStatus>("connecting");
  const [offset, setOffset] = useState(() => (initial ? initial.serverTime - Date.now() : 0));
  const [lastEvent, setLastEvent] = useState<GameEvent | null>(null);
  const failures = useRef(0);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const resync = useCallback(async () => {
    try {
      const res = await fetch(`/api/games/${gameId}/state`, { cache: "no-store" });
      if (!res.ok) return;
      const s = (await res.json()) as GameStatePublic;
      setOffset(s.serverTime - Date.now());
      setState(s);
    } catch {
      /* ignore */
    }
  }, [gameId]);

  useEffect(() => {
    let es: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    const stopPolling = () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
      pollTimer.current = null;
    };
    const startPolling = () => {
      if (pollTimer.current) return;
      setConnection("polling");
      pollTimer.current = setInterval(resync, 2000);
    };

    const connect = () => {
      if (disposed) return;
      setConnection((c) => (c === "polling" ? c : "connecting"));
      es = new EventSource(`/api/games/${gameId}/events`);
      const handle = (raw: MessageEvent) => {
        try {
          const event = JSON.parse(raw.data) as GameEvent;
          if ("serverTime" in event && typeof event.serverTime === "number") setOffset(event.serverTime - Date.now());
          if (event.type === "snapshot") setOffset(event.state.serverTime - Date.now());
          setState((prev) => reduceGameState(prev, event));
          setLastEvent(event);
          // Results are computed server-side at the end: fetch the full state once.
          if (event.type === "game_finished") void resync();
        } catch {
          /* malformed */
        }
      };
      for (const type of ["snapshot", "players", "question_started", "answer_count", "question_ended", "leaderboard", "paused", "resumed", "game_finished", "heartbeat"]) {
        es.addEventListener(type, handle as EventListener);
      }
      es.onopen = () => {
        failures.current = 0;
        stopPolling();
        setConnection("live");
      };
      es.onerror = () => {
        es?.close();
        es = null;
        failures.current += 1;
        if (failures.current >= 3) startPolling();
        else setConnection("offline");
        const delay = Math.min(10_000, 1000 * 2 ** failures.current);
        retry = setTimeout(() => {
          void resync();
          connect();
        }, delay);
      };
    };

    connect();
    const onVisible = () => {
      if (document.visibilityState === "visible") void resync();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      disposed = true;
      es?.close();
      if (retry) clearTimeout(retry);
      stopPolling();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [gameId, resync]);

  /** Current server time estimate. */
  const now = useCallback(() => Date.now() + offset, [offset]);

  return { state, connection, now, resync, lastEvent };
}
