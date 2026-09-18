import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { Stat } from "@/components/ui/stat";
import { prisma } from "@/lib/prisma";
import { guardPage } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Administration" };

export default async function AdminHome() {
  await guardPage(["ADMIN"], "/admin");
  const [users, trainers, games, sessions] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "TRAINER" } }),
    prisma.escapeGame.count(),
    prisma.gameSession.count(),
  ]);
  return (
    <>
      <PageHeader eyebrow="Administration" title="Vue globale de la plateforme" description="Comptes, contenus et activité." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Utilisateurs" value={users} />
        <Stat label="Formateurs" value={trainers} />
        <Stat label="Escape Games" value={games} />
        <Stat label="Sessions" value={sessions} />
      </div>
    </>
  );
}
