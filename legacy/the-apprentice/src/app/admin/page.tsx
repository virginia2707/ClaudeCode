import { redirect } from "next/navigation";
import { NavBar } from "@/components/nav-bar";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { RoleValue } from "@/lib/constants";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");

  const [userCount, simulationCount, progressCount, users, simulations] = await Promise.all([
    prisma.user.count(),
    prisma.simulation.count(),
    prisma.progress.count(),
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.simulation.findMany({
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: { createdBy: true, _count: { select: { progresses: true } } },
    }),
  ]);

  return (
    <div className="flex-1">
      <NavBar user={{ name: user.name, role: user.role as RoleValue }} />
      <div className="mx-auto max-w-5xl px-6 py-10 space-y-8">
        <h1 className="text-2xl font-semibold">Administration</h1>

        <div className="grid sm:grid-cols-3 gap-4">
          <Tile label="Utilisateurs" value={userCount} />
          <Tile label="Simulations" value={simulationCount} />
          <Tile label="Sessions apprenants" value={progressCount} />
        </div>

        <section className="card p-6">
          <h2 className="font-semibold mb-4">Simulations</h2>
          <div className="space-y-2">
            {simulations.map((s) => (
              <div key={s.id} className="card-2 p-4 flex items-center justify-between text-sm">
                <span>{s.title} — {s.createdBy.name}</span>
                <span className="text-text-muted">{s.status} · {s._count.progresses} apprenant(s)</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-6">
          <h2 className="font-semibold mb-4">Utilisateurs</h2>
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.id} className="card-2 p-4 flex items-center justify-between text-sm">
                <span>{u.name} — {u.email}</span>
                <span className="text-text-muted">{u.role} · {u.plan}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-text-muted uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-semibold text-accent mt-1">{value}</p>
    </div>
  );
}
