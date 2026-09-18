import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/ui/logo";
import { Pill } from "@/components/ui/pill";
import { logoutAction } from "@/actions/auth";
import type { CurrentUser } from "@/lib/auth/session";
import { PLAN_LIMITS } from "@/lib/plans";
import type { Plan } from "@/lib/constants";
import { AppNav, type NavItem } from "@/components/app/app-nav";

const trainerNav: NavItem[] = [
  { href: "/app", label: "Tableau de bord", icon: "grid", exact: true },
  { href: "/app/games", label: "Mes Escape Games", icon: "layers" },
  { href: "/app/sessions", label: "Sessions", icon: "play" },
  { href: "/app/skills", label: "Compétences", icon: "target" },
  { href: "/app/settings", label: "Paramètres", icon: "building" },
];
const adminNav: NavItem[] = [
  { href: "/admin", label: "Vue globale", icon: "chart", exact: true },
  { href: "/admin/users", label: "Utilisateurs", icon: "users" },
  { href: "/admin/games", label: "Escape Games", icon: "layers" },
  { href: "/app", label: "Mon espace formateur", icon: "grid" },
];

export function AppShell({ user, area, children }: { user: CurrentUser; area: "trainer" | "admin"; children: ReactNode }) {
  const nav = area === "admin" ? adminNav : trainerNav;
  const plan = PLAN_LIMITS[user.plan as Plan] ?? PLAN_LIMITS.FREE;
  return (
    <div className="flex-1 flex flex-col lg:flex-row min-h-screen">
      <aside className="lg:w-64 lg:flex-none border-b lg:border-b-0 lg:border-r border-border bg-bg-elevated">
        <div className="flex items-center justify-between gap-3 px-4 h-16 lg:h-auto lg:px-5 lg:pt-6 lg:pb-4">
          <Logo href={area === "admin" ? "/admin" : "/app"} />
          <Pill tone={area === "admin" ? "warning" : "accent"} className="lg:hidden">
            {area === "admin" ? "Admin" : plan.label}
          </Pill>
        </div>
        <AppNav items={nav} />
        <div className="hidden lg:block px-5 py-4 mt-auto border-t border-border">
          <div className="text-sm font-medium truncate">
            {user.firstName} {user.lastName}
          </div>
          <div className="text-xs text-text-muted truncate">{user.email}</div>
          <div className="mt-2 flex items-center gap-2">
            <Pill tone={area === "admin" ? "warning" : "accent"}>{area === "admin" ? "Administrateur" : `Plan ${plan.label}`}</Pill>
            <form action={logoutAction}>
              <button type="submit" className="text-xs text-text-muted hover:text-danger underline-offset-4 hover:underline">
                Déconnexion
              </button>
            </form>
          </div>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="hidden lg:flex h-14 items-center justify-end gap-3 px-6 border-b border-border text-sm text-text-muted">
          <Link href="/" className="hover:text-text">
            Site
          </Link>
          <Link href="/join" className="hover:text-text">
            Rejoindre une mission
          </Link>
        </header>
        <main id="contenu" className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
        <div className="lg:hidden border-t border-border px-4 py-3 flex items-center justify-between text-xs text-text-muted">
          <span className="truncate">{user.email}</span>
          <form action={logoutAction}>
            <button type="submit" className="hover:text-danger underline-offset-4 hover:underline">
              Déconnexion
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
