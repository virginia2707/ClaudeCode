"use client";

import { useGameStream } from "@/hooks/use-game-stream";
import type { GameStatePublic } from "@/lib/realtime/events";
import { Logo } from "@/components/ui/logo";
import { ConnectionBadge } from "./connection-badge";
import { WaitingRoom } from "./waiting-room";
import { formatPoints } from "@/lib/utils";

export function PlayerScreen({ gameId, playerId, nickname, initialState }: { gameId: string; playerId: string; nickname: string; initialState: GameStatePublic }) {
  const { state, connection } = useGameStream(gameId, initialState);
  if (!state) return null;
  const me = state.players.find((p) => p.id === playerId);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <Logo href="/" />
        <div className="flex items-center gap-2 text-sm">
          <span className="hidden text-text-muted sm:inline">{nickname}</span>
          {me ? <span className="pill pill-spark tabular-nums">{formatPoints(me.score)} pts</span> : null}
          <ConnectionBadge status={connection} />
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        {state.status === "LOBBY" ? (
          <WaitingRoom state={state} playerId={playerId} />
        ) : (
          <div className="card p-6 text-center text-text-muted">L&apos;écran de jeu arrive dans la phase suivante (statut : {state.status}).</div>
        )}
      </main>
    </div>
  );
}
