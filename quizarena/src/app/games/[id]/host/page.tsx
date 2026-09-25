import type { Metadata } from "next";
import Link from "next/link";
import { getHostedGame } from "@/lib/game/host-access";
import { joinUrl } from "@/lib/game/create";
import { buildPublicState } from "@/lib/game/state";
import { reconcileGame } from "@/lib/game/engine";
import { Logo } from "@/components/ui/logo";
import { Pill } from "@/components/ui/pill";
import { MotionToggle } from "@/components/ui/motion-toggle";
import { HostScreen } from "@/components/host/host-screen";

export const metadata: Metadata = { title: "Écran formateur" };

export default async function HostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { game, user } = await getHostedGame(id);
  await reconcileGame(game.id);
  const state = await buildPublicState(game.id);
  if (!state) return null;

  return (
    <div className="min-h-dvh">
      <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
        <Logo href={user ? "/dashboard" : "/"} />
        <div className="flex items-center gap-2">
          <Pill tone="primary">{state.mode === "TEAM" ? "Mode équipe" : "Mode individuel"}</Pill>
          <Pill>{state.totalQuestions} questions</Pill>
          {game.isDemo ? <Pill tone="spark">Démo</Pill> : null}
          {user ? (
            <Link href="/games" className="btn btn-ghost btn-sm">
              Mes parties
            </Link>
          ) : null}
          <MotionToggle className="btn btn-ghost btn-sm hidden sm:inline-flex" />
        </div>
      </header>
      <main id="main" tabIndex={-1} className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{state.title}</h1>
          {state.description ? <p className="mt-1 text-text-muted">{state.description}</p> : null}
        </div>
        <HostScreen gameId={game.id} initialState={state} joinUrl={joinUrl(game.code)} />
      </main>
    </div>
  );
}
