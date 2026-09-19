import Link from "next/link";
import { logoutAction, switchOrganizationAction } from "@/actions/auth-actions";
import { Badge } from "@/components/ui/badge";
import { Icon, type IconName } from "@/components/ui/icons";
import { Logo } from "@/components/ui/logo";
import type { ActiveMembership, CurrentUser } from "@/lib/auth/current-user";
import { can } from "@/lib/authz/permissions";
import type { OrgRole } from "@/lib/constants";
import { cn } from "@/lib/utils/cn";

type NavItem = { href: string; label: string; icon: IconName };

function navFor(role: OrgRole | null): NavItem[] {
  if (!role) return [{ href: "/app/join", label: "Rejoindre", icon: "compass" }];
  const items: NavItem[] = [];
  if (can(role, "mission:create")) {
    items.push({ href: "/app/trainer", label: "Tableau de bord", icon: "chart" });
    items.push({ href: "/app/trainer/missions", label: "Missions", icon: "layers" });
    items.push({ href: "/app/trainer/sessions", label: "Sessions", icon: "users" });
    items.push({ href: "/app/trainer/learners", label: "Apprenants", icon: "users" });
    items.push({ href: "/app/trainer/skills", label: "Compétences", icon: "target" });
  } else {
    items.push({ href: "/app/learn", label: "Mes missions", icon: "target" });
  }
  if (can(role, "org:manage_members")) items.push({ href: "/app/admin", label: "Organisation", icon: "shield" });
  return items;
}

const ROLE_LABEL: Record<OrgRole, string> = { ADMIN: "Admin", TRAINER: "Formateur", LEARNER: "Apprenant" };

export function AppShell({
  user,
  membership,
  children,
}: {
  user: CurrentUser;
  membership: ActiveMembership | null;
  children: React.ReactNode;
}) {
  const role = (membership?.role ?? null) as OrgRole | null;
  const nav = navFor(role);
  return (
    <div className="flex min-h-full flex-1 flex-col lg:flex-row">
      <aside className="border-b border-border bg-bg-elevated lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:border-b-0 lg:border-r">
        <div className="flex h-16 items-center justify-between px-4">
          <Logo href="/app" />
          {role && <Badge tone="accent">{ROLE_LABEL[role]}</Badge>}
        </div>
        <nav aria-label="Navigation de l'application" className="px-2 pb-3 lg:pb-0">
          <ul className="flex gap-1 overflow-x-auto lg:flex-col">
            {nav.map((item) => (
              <li key={item.href} className="shrink-0">
                <Link href={item.href} className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-text-secondary hover:bg-surface-2 hover:text-text">
                  <Icon name={item.icon} className="h-4 w-4" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="hidden border-t border-border p-4 lg:absolute lg:bottom-0 lg:block lg:w-full">
          <UserBox user={user} membership={membership} />
        </div>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-2 lg:hidden">
          <UserBox user={user} membership={membership} compact />
        </header>
        <main id="contenu" className={cn("container-x flex-1 py-8")}>
          {children}
        </main>
      </div>
    </div>
  );
}

function UserBox({ user, membership, compact = false }: { user: CurrentUser; membership: ActiveMembership | null; compact?: boolean }) {
  const others = user.memberships.filter((m) => m.organizationId !== membership?.organizationId);
  return (
    <div className={cn("flex w-full items-center gap-3", compact && "justify-between")}>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{user.name}</p>
        <p className="truncate text-xs text-text-muted">{membership?.organization.name ?? "Aucune organisation"}</p>
        {others.length > 0 && (
          <form action={switchOrganizationAction} className="mt-2">
            <label htmlFor={compact ? "org-switch-m" : "org-switch"} className="sr-only">
              Changer d&apos;organisation
            </label>
            <select id={compact ? "org-switch-m" : "org-switch"} name="organizationId" className="input !min-h-8 !py-1 text-xs" defaultValue="">
              <option value="" disabled>
                Changer d&apos;organisation…
              </option>
              {others.map((m) => (
                <option key={m.organizationId} value={m.organizationId}>
                  {m.organization.name}
                </option>
              ))}
            </select>
            <button type="submit" className="btn btn-ghost btn-sm mt-1">
              Basculer
            </button>
          </form>
        )}
      </div>
      <form action={logoutAction}>
        <button type="submit" className="btn btn-ghost btn-sm" title="Se déconnecter">
          <Icon name="close" className="h-4 w-4" />
          <span className={compact ? "sr-only" : undefined}>Déconnexion</span>
        </button>
      </form>
    </div>
  );
}
