import Link from "next/link";
import { redirect } from "next/navigation";
import { NavBar } from "@/components/nav-bar";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { RoleValue } from "@/lib/constants";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Brouillon",
  PUBLISHED: "Publiée",
  ARCHIVED: "Archivée",
};

export default async function FormateurDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "FORMATEUR" && user.role !== "ADMIN") redirect("/dashboard");

  const simulations = await prisma.simulation.findMany({
    where: { createdById: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { progresses: true, missions: true } },
    },
  });

  return (
    <div className="flex-1">
      <NavBar user={{ name: user.name, role: user.role as RoleValue }} />
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold">Vos simulations</h1>
            <p className="text-text-muted text-sm mt-1">
              Plan actuel : <span className="text-accent">{user.plan}</span>
            </p>
          </div>
          <Link href="/formateur/simulations/new" className="btn btn-primary">
            + Créer une simulation
          </Link>
        </div>

        {simulations.length === 0 ? (
          <div className="card p-10 text-center text-text-muted">
            Vous n&apos;avez pas encore créé de simulation.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {simulations.map((s) => (
              <Link key={s.id} href={`/formateur/simulations/${s.id}`} className="card p-5 block hover:border-accent transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="pill">{STATUS_LABEL[s.status] ?? s.status}</span>
                  {s.accessCode && <span className="text-xs text-text-muted font-mono">{s.accessCode}</span>}
                </div>
                <h3 className="font-semibold">{s.title}</h3>
                <p className="text-sm text-text-muted mt-1">{s.job} · {s.company}</p>
                <p className="text-xs text-text-muted mt-3">
                  {s._count.missions} mission(s) · {s._count.progresses} apprenant(s)
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
