import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { StepList, type StepRow } from "@/components/builder/step-list";
import { ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Stat } from "@/components/ui/stat";
import { guardPage } from "@/lib/auth/guards";
import { getOwnedGame } from "@/lib/games/queries";
import { hasBlockingIssues, validateForPublish } from "@/lib/games/publish";
import { PUZZLE_LABELS } from "@/lib/puzzles/registry";
import type { PuzzleType } from "@/lib/puzzles/types";
import { formatDuration } from "@/lib/format";

export const metadata: Metadata = { title: "Step Builder" };

export default async function StepsPage(props: PageProps<"/app/games/[id]/steps">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const user = await guardPage(["TRAINER", "ADMIN"], `/app/games/${id}/steps`);
  const game = await getOwnedGame(id, user.id, { allowAdmin: true, role: user.role });
  if (!game) notFound();

  const issues = validateForPublish(game);
  const rows: StepRow[] = game.steps.map((s) => ({
    id: s.id,
    title: s.title,
    puzzleType: s.puzzle?.type ?? null,
    puzzleLabel: s.puzzle ? (PUZZLE_LABELS[s.puzzle.type as PuzzleType] ?? s.puzzle.type) : "Sans énigme",
    points: s.points,
    recommendedSeconds: s.recommendedSeconds,
    unlockCode: s.unlockCode,
    isFinal: s.isFinal,
    hintCount: s.puzzle?.hints.length ?? 0,
    answerCount: s.puzzle?.answers.length ?? 0,
    skills: s.puzzle?.skills.map((ps) => ps.skill.name) ?? [],
    ready: !issues.some((i) => i.stepId === s.id && i.level === "error"),
  }));
  const totalSeconds = game.steps.reduce((acc, s) => acc + s.recommendedSeconds, 0);
  const totalPoints = game.steps.reduce((acc, s) => acc + s.points, 0);

  return (
    <>
      <nav aria-label="Fil d'Ariane" className="mb-3 text-sm text-text-muted">
        <Link href="/app/games" className="hover:text-text">
          Mes Escape Games
        </Link>{" "}
        /{" "}
        <Link href={`/app/games/${game.id}`} className="hover:text-text">
          {game.title}
        </Link>{" "}
        / <span className="text-text">Étapes</span>
      </nav>
      <PageHeader
        title="Step Builder"
        description="Chaque étape porte une énigme, des indices, une compétence et un code de déblocage."
        actions={
          <>
            <ButtonLink href={`/app/games/${game.id}/preview`} variant="secondary">
              Prévisualiser
            </ButtonLink>
            <ButtonLink href={`/app/games/${game.id}`} variant="ghost">
              Retour au jeu
            </ButtonLink>
          </>
        }
      />
      {sp.created ? (
        <Alert tone="success" className="mb-4">
          Escape Game créé. Ajoutez maintenant vos étapes et vos énigmes.
        </Alert>
      ) : null}
      {hasBlockingIssues(issues) ? (
        <Alert tone="warning" className="mb-4">
          Ce jeu n&apos;est pas encore publiable : {issues.filter((i) => i.level === "error").length} point(s) à corriger. Les étapes concernées sont marquées « À compléter ».
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <Stat label="Étapes" value={game.steps.length} />
        <Stat label="Temps recommandé cumulé" value={formatDuration(totalSeconds)} hint={`durée estimée annoncée : ${game.estimatedMinutes} min`} />
        <Stat label="Points disponibles" value={totalPoints} hint="hors bonus et pénalités" />
      </div>

      <StepList gameId={game.id} steps={rows} />
    </>
  );
}
