import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { ButtonLink } from "@/components/ui/button";

export type HeaderUser = { name: string; role: string } | null;

export function SiteHeader({ user, logoutAction }: { user: HeaderUser; logoutAction?: () => Promise<void> }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-[rgba(11,14,20,0.8)] backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Navigation principale" className="flex items-center gap-2 sm:gap-3">
          <Link href="/join" className="btn btn-ghost btn-sm">
            <span className="sm:hidden">Jouer</span>
            <span className="hidden sm:inline">Jouer avec un code</span>
          </Link>
          {user ? (
            <>
              <Link href="/dashboard" className="btn btn-secondary btn-sm">
                <span className="sm:hidden">Tableau</span>
                <span className="hidden sm:inline">Tableau de bord</span>
              </Link>
              {logoutAction ? (
                <form action={logoutAction}>
                  <button type="submit" className="btn btn-ghost btn-sm">
                    Déconnexion
                  </button>
                </form>
              ) : null}
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost btn-sm hidden sm:inline-flex">
                Se connecter
              </Link>
              <ButtonLink href="/register" size="sm">
                <span className="sm:hidden">Créer un quiz</span>
                <span className="hidden sm:inline">Créer mon quiz</span>
              </ButtonLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
