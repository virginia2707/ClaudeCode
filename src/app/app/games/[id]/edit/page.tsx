import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { GameForm } from "@/components/builder/game-form";
import { guardPage } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Modifier l'Escape Game" };

export default async function EditGamePage(props: PageProps<"/app/games/[id]/edit">) {
  const { id } = await props.params;
  const user = await guardPage(["TRAINER", "ADMIN"], `/app/games/${id}/edit`);
  const game = await prisma.escapeGame.findFirst({ where: user.role === "ADMIN" ? { id } : { id, ownerId: user.id } });
  if (!game) notFound();
  let targetSkills: string[] = [];
  try {
    targetSkills = JSON.parse(game.targetSkills);
  } catch {
    targetSkills = [];
  }
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
        / <span className="text-text">Modifier</span>
      </nav>
      <PageHeader title="Modifier l'Escape Game" description={game.status === "PUBLISHED" ? "Ce jeu est publié : les modifications s'appliquent aux prochaines sessions." : undefined} />
      <div className="max-w-3xl">
        <GameForm
          gameId={game.id}
          cancelHref={`/app/games/${game.id}`}
          initial={{
            title: game.title,
            description: game.description,
            category: game.category,
            level: game.level,
            difficulty: game.difficulty,
            estimatedMinutes: game.estimatedMinutes,
            objective: game.objective,
            targetSkills: targetSkills.join(", "),
            scenario: game.scenario,
            introduction: game.introduction,
            finalMessage: game.finalMessage,
            coverImageUrl: game.coverImageUrl ?? "",
            mode: game.mode,
            maxParticipants: game.maxParticipants,
          }}
        />
      </div>
    </>
  );
}
