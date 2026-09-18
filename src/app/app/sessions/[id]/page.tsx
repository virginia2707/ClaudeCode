import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { LiveBoard } from "@/components/live/live-board";
import { guardPage } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { getLiveState } from "@/lib/sessions/live";
import { getAppUrl } from "@/lib/app-url";

export const metadata: Metadata = { title: "Session en direct" };

export default async function LiveSessionPage(props: PageProps<"/app/sessions/[id]">) {
  const { id } = await props.params;
  const user = await guardPage(["TRAINER", "ADMIN"], `/app/sessions/${id}`);
  const session = await prisma.gameSession.findFirst({
    where: user.role === "ADMIN" ? { id } : { id, hostId: user.id },
    select: { id: true, gameId: true },
  });
  if (!session) notFound();
  const state = await getLiveState(session.id, await getAppUrl());
  if (!state) notFound();

  return (
    <>
      <nav aria-label="Fil d'Ariane" className="mb-3 text-sm text-text-muted">
        <Link href="/app/sessions" className="hover:text-text">
          Sessions
        </Link>{" "}
        / <span className="text-text">{state.session.gameTitle}</span>
      </nav>
      <PageHeader
        title={state.session.gameTitle}
        description="Écran de pilotage : progression, blocages, indices et classement en direct."
        eyebrow={`Session ${state.session.code}`}
      />
      <LiveBoard initial={state} />
    </>
  );
}
