import Link from "next/link";
import { logoutAction } from "@/actions/auth-actions";
import type { RoleValue } from "@/lib/constants";

const ROLE_LABEL: Record<RoleValue, string> = {
  ADMIN: "Admin",
  FORMATEUR: "Formateur",
  APPRENANT: "Apprenant",
};

export function NavBar({ user }: { user?: { name: string; role: RoleValue } | null }) {
  const homeHref =
    user?.role === "ADMIN" ? "/admin" : user?.role === "FORMATEUR" ? "/formateur" : "/apprenant";

  return (
    <header className="border-b border-border/80 bg-bg/80 backdrop-blur sticky top-0 z-30">
      <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
        <Link href={user ? homeHref : "/"} className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight text-text">
            THE <span className="text-accent">APPRENTICE</span>
          </span>
        </Link>

        {user ? (
          <div className="flex items-center gap-3">
            <span className="pill">{ROLE_LABEL[user.role]}</span>
            <span className="text-sm text-text-muted hidden sm:inline">{user.name}</span>
            <form action={logoutAction}>
              <button className="btn btn-ghost text-sm">Déconnexion</button>
            </form>
          </div>
        ) : (
          <nav className="flex items-center gap-2">
            <Link href="/login" className="btn btn-ghost text-sm">
              Connexion
            </Link>
            <Link href="/register" className="btn btn-primary text-sm">
              Créer un compte
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
