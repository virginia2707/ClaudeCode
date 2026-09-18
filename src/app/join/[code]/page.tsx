import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { normalizeSessionCode } from "@/lib/engine/session-code";
import { readSnapshot } from "@/lib/sessions/snapshot";
import { getPlayerToken } from "@/lib/auth/player";
import { JoinSessionForm } from "@/components/play/join-session-form";
import { Logo } from "@/components/ui/logo";
import { Pill } from "@/components/ui/pill";
import { Alert } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Rejoindre la mission" };

export default async function JoinCodePage(props: PageProps<"/join/[code]">) {
  const { code } = await props.params;
  const session = await prisma.gameSession.findUnique({
    where: { code: normalizeSessionCode(code) },
    include: { game: { select: { maxParticipants: true } }, _count: { select: { players: true } } },
  });
  if (!session) notFound();

  // Déjà inscrit dans cette session depuis ce navigateur : on reprend la partie.
  const token = await getPlayerToken(session.id);
  if (token) redirect(`/play/${session.code}`);

  const snapshot = readSnapshot(session.gameSnapshot);
  const full = session._count.players >= session.game.maxParticipants;

  return (
    <main id="contenu" className="flex-1 relative overflow-hidden flex items-center justify-center p-4">
      <div className="absolute inset-0 grid-bg" aria-hidden="true" />
      <div className="relative w-full max-w-md card-glow p-6">
        <Logo className="justify-center" />
        <div className="mt-6 text-center">
          <span className="code-chip text-lg">{session.code}</span>
          <h1 className="mt-3 text-xl font-semibold">{snapshot.title}</h1>
          {snapshot.description ? <p className="mt-1.5 text-sm text-text-muted">{snapshot.description}</p> : null}
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <Pill tone="accent">{session.mode === "TEAM" ? "En équipe" : "Individuel"}</Pill>
            <Pill>{snapshot.steps.length} étapes</Pill>
            {snapshot.settings.timerMode !== "NONE" ? <Pill tone="highlight">{snapshot.settings.maxMinutes} min</Pill> : <Pill>Sans limite</Pill>}
          </div>
        </div>
        <div className="mt-6">
          {session.status === "ENDED" ? (
            <Alert tone="warning">Cette session est terminée.</Alert>
          ) : full ? (
            <Alert tone="warning">Cette session est complète ({session.game.maxParticipants} participants).</Alert>
          ) : (
            <JoinSessionForm code={session.code} teamMode={session.mode === "TEAM"} running={session.status !== "LOBBY"} />
          )}
        </div>
      </div>
    </main>
  );
}
