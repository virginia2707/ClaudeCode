import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { LaunchForm } from "@/components/live/launch-form";
import { Alert } from "@/components/ui/alert";
import { Pill } from "@/components/ui/pill";
import { guardPage } from "@/lib/auth/guards";
import { getOwnedGame } from "@/lib/games/queries";
import { hasBlockingIssues, validateForPublish } from "@/lib/games/publish";

export const metadata: Metadata = { title: "Lancer une session" };

export default async function LaunchPage(props: PageProps<"/app/games/[id]/launch">) {
  const { id } = await props.params;
  const user = await guardPage(["TRAINER", "ADMIN"], `/app/games/${id}/launch`);
  const game = await getOwnedGame(id, user.id, { allowAdmin: true, role: user.role });
  if (!game) notFound();
  const issues = validateForPublish(game);
  const blocked = game.status !== "PUBLISHED" || hasBlockingIssues(issues);

  return (
    <>
      <nav aria-label="Fil d'Ariane" className="mb-3 text-sm text-text-muted">
        <Link href={`/app/games/${game.id}`} className="hover:text-text">
          {game.title}
        </Link>{" "}
        / <span className="text-text">Lancer une session</span>
      </nav>
      <PageHeader title="Lancer une session" description="Un code et un QR code seront générés pour vos apprenants." />
      <div className="max-w-xl space-y-4">
        <div className="card p-5">
          <h2 className="font-semibold">{game.title}</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            <Pill>{game.steps.length} étapes</Pill>
            <Pill>{game.settings?.timerMode === "NONE" ? "Sans limite de temps" : `${game.settings?.maxMinutes ?? game.estimatedMinutes} minutes`}</Pill>
            <Pill>{game.maxParticipants} participants max</Pill>
          </div>
          <p className="mt-3 text-sm text-text-muted">
            La session travaille sur une copie figée du jeu : vos modifications ultérieures n&apos;affecteront pas les participants en cours.
          </p>
        </div>
        {game.status !== "PUBLISHED" ? (
          <Alert tone="warning">
            Ce jeu est en {game.status === "DRAFT" ? "brouillon" : "archive"}.{" "}
            <Link href={`/app/games/${game.id}`} className="underline underline-offset-4">
              Publiez-le
            </Link>{" "}
            avant de lancer une session.
          </Alert>
        ) : null}
        {hasBlockingIssues(issues) ? <Alert tone="danger">Corrigez les erreurs bloquantes avant de lancer une session.</Alert> : null}
        <LaunchForm gameId={game.id} defaultMode={game.mode} disabled={blocked} />
      </div>
    </>
  );
}
