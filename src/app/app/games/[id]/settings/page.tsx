import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { SettingsForm } from "@/components/builder/settings-form";
import { guardPage } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Réglages du jeu" };

export default async function GameSettingsPage(props: PageProps<"/app/games/[id]/settings">) {
  const { id } = await props.params;
  const user = await guardPage(["TRAINER", "ADMIN"], `/app/games/${id}/settings`);
  const game = await prisma.escapeGame.findFirst({ where: user.role === "ADMIN" ? { id } : { id, ownerId: user.id }, include: { settings: true } });
  if (!game) notFound();
  const s = game.settings ?? (await prisma.gameSetting.create({ data: { gameId: game.id, maxMinutes: game.estimatedMinutes } }));
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
        / <span className="text-text">Réglages</span>
      </nav>
      <PageHeader title="Réglages du jeu" description="Chronomètre, score, classement et immersion. Tout est activable ou désactivable." />
      <div className="max-w-3xl">
        <SettingsForm gameId={game.id} backHref={`/app/games/${game.id}`} initial={s} />
      </div>
    </>
  );
}
