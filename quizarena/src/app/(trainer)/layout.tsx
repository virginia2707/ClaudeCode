import Link from "next/link";
import { redirect } from "next/navigation";
import { LayoutDashboard, ListChecks, Play, BarChart3, User } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { MotionToggle } from "@/components/ui/motion-toggle";
import { getCurrentUser } from "@/lib/auth/session";
import { logoutAction } from "@/actions/auth";

const NAV = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/quizzes", label: "Mes quiz", icon: ListChecks },
  { href: "/games", label: "Mes parties", icon: Play },
  { href: "/stats", label: "Statistiques", icon: BarChart3 },
];

export default async function TrainerLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");
  if (user.role === "LEARNER") redirect("/profile");

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="border-b border-border bg-bg-elevated lg:sticky lg:top-0 lg:h-dvh lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-4 py-4 lg:block lg:px-5">
          <Logo />
          <span className="pill pill-primary lg:hidden">{user.plan}</span>
        </div>
        <nav aria-label="Navigation formateur" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:px-3 lg:pb-0">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-text-muted hover:bg-surface-2 hover:text-text"
            >
              <item.icon className="size-4" aria-hidden="true" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden border-t border-border p-4 lg:absolute lg:bottom-0 lg:left-0 lg:right-0 lg:block">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-primary-soft text-primary-strong">
              <User className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{user.name}</div>
              <div className="truncate text-xs text-text-muted">{user.email}</div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="pill pill-primary">{user.plan}</span>
            <form action={logoutAction}>
              <button type="submit" className="btn btn-ghost btn-sm">
                Déconnexion
              </button>
            </form>
          </div>
          <div className="mt-2">
            <MotionToggle className="btn btn-ghost btn-sm w-full justify-start" />
          </div>
        </div>
      </aside>
      <main id="main" tabIndex={-1} className="min-w-0 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mb-4 flex items-center justify-end gap-2 lg:hidden">
          <span className="text-sm text-text-muted">{user.name}</span>
          <form action={logoutAction}>
            <button type="submit" className="btn btn-ghost btn-sm">
              Déconnexion
            </button>
          </form>
        </div>
        {children}
      </main>
    </div>
  );
}
