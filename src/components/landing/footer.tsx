import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-bg-elevated">
      <div className="container-x py-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <Logo />
          <p className="mt-3 text-sm text-text-muted max-w-xs">
            Escape games pédagogiques numériques pour la formation professionnelle.
          </p>
        </div>
        <nav aria-label="Produit">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Produit</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link className="hover:text-accent" href="/#comment-ca-marche">Comment ça marche</Link></li>
            <li><Link className="hover:text-accent" href="/#fonctionnalites">Fonctionnalités</Link></li>
            <li><Link className="hover:text-accent" href="/demo">Démo</Link></li>
            <li><Link className="hover:text-accent" href="/#tarifs">Tarifs</Link></li>
          </ul>
        </nav>
        <nav aria-label="Pour qui">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Pour qui</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link className="hover:text-accent" href="/#formateurs">Formateurs</Link></li>
            <li><Link className="hover:text-accent" href="/#organismes">Organismes de formation</Link></li>
            <li><Link className="hover:text-accent" href="/join">Apprenants : rejoindre</Link></li>
          </ul>
        </nav>
        <nav aria-label="Compte">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Compte</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link className="hover:text-accent" href="/login">Connexion</Link></li>
            <li><Link className="hover:text-accent" href="/register">Créer un compte</Link></li>
            <li><Link className="hover:text-accent" href="/#faq">FAQ</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-border">
        <div className="container-x py-4 text-xs text-text-subtle flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} EscapeClass. Tous droits réservés.</span>
          <span>Conçu pour la formation professionnelle des adultes.</span>
        </div>
      </div>
    </footer>
  );
}
