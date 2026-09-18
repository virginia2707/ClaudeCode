import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getPlayerSession } from "@/lib/game/player-access";
import { buildPublicState } from "@/lib/game/state";
import { reconcileGame } from "@/lib/game/engine";
import { PlayerScreen } from "@/components/play/player-screen";

export const metadata: Metadata = { title: "Partie en cours" };

export default async function PlayPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const game = await prisma.game.findUnique({ where: { id: gameId }, select: { code: true } });
  if (!game) redirect("/join");
  const player = await getPlayerSession(gameId);
  if (!player) redirect(`/join?code=${game.code}`);
  await reconcileGame(gameId);
  const state = await buildPublicState(gameId);
  if (!state) redirect("/join");
  return <PlayerScreen gameId={gameId} playerId={player.id} nickname={player.nickname} initialState={state} />;
}
