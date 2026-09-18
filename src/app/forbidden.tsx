import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export default function Forbidden() {
  return (
    <main id="contenu" className="flex-1 flex items-center justify-center p-6">
      <div className="card-glow p-8 max-w-md text-center">
        <Logo className="justify-center" />
        <p className="mt-6 font-mono text-xs text-warning tracking-[0.2em]">ACCÈS REFUSÉ · 403</p>
        <h1 className="mt-2 text-2xl font-semibold">Vous n&apos;avez pas accès à cette page</h1>
        <p className="mt-2 text-sm text-text-muted">Cette zone est réservée à un autre rôle. Connectez-vous avec le bon compte ou revenez à votre espace.</p>
        <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
          <ButtonLink href="/app">Mon espace</ButtonLink>
          <ButtonLink href="/" variant="secondary">
            Accueil
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}
