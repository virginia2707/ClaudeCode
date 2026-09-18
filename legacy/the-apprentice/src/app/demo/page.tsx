import Link from "next/link";
import { NavBar } from "@/components/nav-bar";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEMO_ACCESS_CODE } from "@/lib/seed-constants";

export default async function DemoPage() {
  const user = await getCurrentUser();
  const simulation = await prisma.simulation.findUnique({
    where: { accessCode: DEMO_ACCESS_CODE },
    include: { skills: { orderBy: { order: "asc" } }, missions: { orderBy: { order: "asc" } } },
  });

  return (
    <div className="flex-1">
      <NavBar user={user ? { name: user.name, role: user.role as never } : null} />
      <div className="mx-auto max-w-3xl px-6 py-12 space-y-8">
        {!simulation ? (
          <div className="card p-10 text-center text-text-muted">
            La simulation de démonstration n&apos;a pas encore été initialisée (lancez <code>npm run seed</code>).
          </div>
        ) : (
          <>
            <div className="text-center">
              <p className="pill w-fit mx-auto mb-3">Simulation de démonstration</p>
              <h1 className="text-3xl font-bold">{simulation.title}</h1>
              <p className="text-text-muted mt-2">{simulation.company} · {simulation.durationDays} jours</p>
            </div>

            <p className="text-text-muted text-center">{simulation.description}</p>

            <section className="card p-6">
              <h2 className="font-semibold mb-3">Compétences évaluées</h2>
              <div className="flex flex-wrap gap-2">
                {simulation.skills.map((s) => (
                  <span key={s.id} className="pill">{s.name}</span>
                ))}
              </div>
            </section>

            <section className="card p-6">
              <h2 className="font-semibold mb-3">Programme</h2>
              <div className="space-y-2">
                {simulation.missions.map((m) => (
                  <div key={m.id} className="card-2 p-4">
                    <p className="font-medium">Jour {m.dayNumber} — {m.title}</p>
                    <p className="text-sm text-text-muted mt-1">{m.description}</p>
                  </div>
                ))}
              </div>
            </section>

            <div className="text-center space-y-3">
              <p className="text-text-muted text-sm">Code d&apos;accès : <span className="font-mono text-accent">{simulation.accessCode}</span></p>
              <Link href={`/register?role=APPRENANT`} className="btn btn-primary px-6 py-3">
                Créer un compte et jouer →
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
