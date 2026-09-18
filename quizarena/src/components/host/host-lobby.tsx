"use client";

import type { ReactNode } from "react";
import type { ConnectionStatus } from "@/hooks/use-game-stream";
import type { GameStatePublic } from "@/lib/realtime/events";
import { Pill } from "@/components/ui/pill";
import { ConnectionBadge } from "@/components/play/connection-badge";
import { CodePanel } from "./code-panel";
import { cn } from "@/lib/utils";

export function HostLobby({
  state,
  connection,
  joinUrl,
  startButton,
}: {
  state: GameStatePublic;
  connection: ConnectionStatus;
  joinUrl: string;
  startButton: ReactNode;
}) {
  const connected = state.players.filter((p) => p.connected).length;
  const byTeam = state.mode === "TEAM" ? state.teams.map((t) => ({ team: t, players: state.players.filter((p) => p.teamId === t.id) })) : null;

  return (
    <div className="space-y-6">
      <CodePanel code={state.code} joinUrl={joinUrl} />
      <section className="card p-5" aria-labelledby="lobby-title">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="lobby-title" className="font-semibold">
            Participants connectés
          </h2>
          <div className="flex items-center gap-2">
            <Pill tone="info" aria-live="polite">
              {connected} / {state.players.length}
            </Pill>
            <ConnectionBadge status={connection} />
          </div>
        </div>
        {state.players.length === 0 ? (
          <p className="mt-3 text-sm text-text-muted" aria-live="polite">
            En attente des participants…
          </p>
        ) : byTeam ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {byTeam.map(({ team, players }) => (
              <div key={team.id} className="card-2 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <span className="size-3 rounded-full" style={{ background: team.color }} aria-hidden="true" />
                  {team.name}
                  <span className="text-text-faint">· {players.length}</span>
                </div>
                <ul className="mt-2 flex flex-wrap gap-2" aria-live="polite">
                  {players.map((p) => (
                    <PlayerChip key={p.id} nickname={p.nickname} connected={p.connected} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2" aria-live="polite">
            {state.players.map((p) => (
              <PlayerChip key={p.id} nickname={p.nickname} connected={p.connected} />
            ))}
          </ul>
        )}
        <div className="mt-5">{startButton}</div>
      </section>
    </div>
  );
}

function PlayerChip({ nickname, connected }: { nickname: string; connected: boolean }) {
  return (
    <li className={cn("pill anim-pop", !connected && "opacity-50")}>
      <span className={cn("size-1.5 rounded-full", connected ? "bg-success" : "bg-danger")} aria-hidden="true" />
      {nickname}
      <span className="sr-only">{connected ? " (connecté)" : " (déconnecté)"}</span>
    </li>
  );
}
