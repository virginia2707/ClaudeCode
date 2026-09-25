import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";
import { JoinForm } from "@/components/play/join-form";
import { findJoinableGame, JoinError } from "@/lib/game/join";
import { normalizeCode } from "@/lib/game/code";

export const metadata: Metadata = { title: "Rejoindre une partie" };

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ code?: string; nickname?: string }> }) {
  const { code: rawCode, nickname } = await searchParams;
  const code = rawCode ? normalizeCode(rawCode) : "";
  let gameInfo: { title: string; mode: string; teams: { id: string; name: string; color: string }[]; status: string } | null = null;
  let lookupError: string | null = null;
  if (code) {
    try {
      const g = await findJoinableGame(code);
      gameInfo = { title: g.quiz.title, mode: g.mode, teams: g.teams.map((t) => ({ id: t.id, name: t.name, color: t.color })), status: g.status };
    } catch (err) {
      lookupError = err instanceof JoinError ? err.message : "Impossible de vérifier ce code.";
    }
  }

  return (
    <>
      <AppHeader />
      <main id="main" tabIndex={-1} className="mx-auto max-w-md px-4 py-10 sm:py-16">
        <div className="text-center">
          <div className="text-xs font-bold uppercase tracking-[0.3em] text-primary-strong">Join the arena</div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Rejoindre une partie</h1>
          <p className="mt-2 text-text-muted">Saisissez le code affiché par votre formateur, puis votre prénom ou pseudo.</p>
        </div>
        <div className="card mt-8 p-6">
          <JoinForm initialCode={code} initialNickname={nickname ?? ""} gameInfo={gameInfo} lookupError={lookupError} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
