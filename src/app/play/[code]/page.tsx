import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { normalizeSessionCode } from "@/lib/engine/session-code";
import { getLearnerState } from "@/lib/sessions/engine-runner";
import { resolveProgress } from "@/actions/play";
import { enforceTimeout } from "@/actions/sessions";
import { PlayClient } from "@/components/play/play-client";

export const metadata: Metadata = { title: "Mission en cours" };

export default async function PlayPage(props: PageProps<"/play/[code]">) {
  const { code } = await props.params;
  const normalized = normalizeSessionCode(code);
  const session = await prisma.gameSession.findUnique({ where: { code: normalized }, select: { id: true, code: true } });
  if (!session) notFound();

  const resolved = await resolveProgress(session.id);
  if (!resolved) redirect(`/join/${session.code}`);

  await enforceTimeout(session.id);
  const state = await getLearnerState(session.id, resolved.progressId);
  if (!state) redirect(`/join/${session.code}`);

  return <PlayClient initialState={state} sessionCode={session.code} />;
}
