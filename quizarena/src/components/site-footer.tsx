import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { MotionToggle } from "@/components/ui/motion-toggle";
import { TAGLINE } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="space-y-2">
          <Logo />
          <p className="text-sm text-text-muted">{TAGLINE}</p>
        </div>
        <nav aria-label="Pied de page" className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-text-muted">
          <Link href="/#how" className="hover:text-text">
            Comment ça marche
          </Link>
          <Link href="/#pricing" className="hover:text-text">
            Tarifs
          </Link>
          <Link href="/#faq" className="hover:text-text">
            FAQ
          </Link>
          <Link href="/join" className="hover:text-text">
            Rejoindre une partie
          </Link>
          <MotionToggle />
        </nav>
      </div>
    </footer>
  );
}
