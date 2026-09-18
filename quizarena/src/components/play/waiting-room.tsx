import type { GameStatePublic } from "@/lib/realtime/events";
import { Pill } from "@/components/ui/pill";

export function WaitingRoom({ state, playerId }: { state: GameStatePublic; playerId: string }) {
  const me = state.players.find((p) => p.id === playerId);
  return (
    <div className="anim-fade-up space-y-6">
      <div className="card p-6 text-center sm:p-8">
        <div className="text-xs font-bold uppercase tracking-[0.3em] text-primary-strong">Salle d&apos;attente</div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{state.title}</h1>
        {state.description ? <p className="mt-2 text-sm text-text-muted">{state.description}</p> : null}
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Pill tone="primary">{state.totalQuestions} questions</Pill>
          <Pill>{state.mode === "TEAM" ? "Mode équipe" : "Mode individuel"}</Pill>
          {me?.teamName ? <Pill tone="spark">Équipe {me.teamName}</Pill> : null}
        </div>
        <p className="mt-6 text-text-muted" aria-live="polite">
          <span className="anim-pulse-ring inline-block size-2 rounded-full bg-primary align-middle" aria-hidden="true" /> En attente du lancement par le formateur…
        </p>
      </div>
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Participants</h2>
          <Pill tone="info" aria-live="polite">
            {state.players.length}
          </Pill>
        </div>
        <ul className="mt-3 flex flex-wrap gap-2" aria-live="polite">
          {state.players.map((p) => (
            <li key={p.id} className={p.id === playerId ? "pill pill-primary" : "pill"}>
              {p.nickname}
              {p.teamName ? <span className="text-text-faint"> · {p.teamName}</span> : null}
              {!p.connected ? <span className="sr-only"> (déconnecté)</span> : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
