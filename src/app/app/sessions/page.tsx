import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { StatusPill } from "@/components/app/status-pill";
import { ButtonLink } from "@/components/ui/button";
import { guardPage } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { formatDateTime, pluralize } from "@/lib/format";
import { IconPlay } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Sessions" };

export default async function SessionsPage() {
  const user = await guardPage(["TRAINER", "ADMIN"], "/app/sessions");
  const sessions = await prisma.gameSession.findMany({
    where: { hostId: user.id },
    select: { id: true, code: true, status: true, mode: true, createdAt: true, endedAt: true, game: { select: { id: true, title: true } }, _count: { select: { players: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return (
    <>
      <PageHeader title="Sessions" description="Toutes les sessions que vous avez lancées, en cours ou terminées." />
      {sessions.length === 0 ? (
        <EmptyState
          icon={<IconPlay size={22} />}
          title="Aucune session"
          description="Publiez un Escape Game puis lancez une session pour obtenir un code et un QR code à partager."
          action={<ButtonLink href="/app/games?status=PUBLISHED" variant="secondary">Voir mes jeux publiés</ButtonLink>}
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-text-muted">
              <tr className="border-b border-border">
                <th className="px-4 py-3 font-semibold">Code</th>
                <th className="px-4 py-3 font-semibold">Escape Game</th>
                <th className="px-4 py-3 font-semibold">Mode</th>
                <th className="px-4 py-3 font-semibold">Participants</th>
                <th className="px-4 py-3 font-semibold">Créée le</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sessions.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3">
                    <Link href={`/app/sessions/${s.id}`} className="code-chip text-xs">
                      {s.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/app/sessions/${s.id}`} className="font-medium hover:text-accent">
                      {s.game.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-text-muted">{s.mode === "TEAM" ? "Équipes" : "Individuel"}</td>
                  <td className="px-4 py-3 text-text-muted">{pluralize(s._count.players, "participant")}</td>
                  <td className="px-4 py-3 text-text-muted">{formatDateTime(s.createdAt)}</td>
                  <td className="px-4 py-3">
                    <StatusPill status={s.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
