import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export default function NotFound() {
  return (
    <main id="contenu" className="flex-1 flex items-center justify-center p-6">
      <div className="card-glow p-8 max-w-md text-center">
        <Logo className="justify-center" />
        <p className="mt-6 font-mono text-xs text-accent tracking-[0.2em]">ERREUR 404</p>
        <h1 className="mt-2 text-2xl font-semibold">Cette page n&apos;existe pas</h1>
        <p className="mt-2 text-sm text-text-muted">Le lien est peut-être expiré ou l&apos;adresse incorrecte.</p>
        <ButtonLink href="/" className="mt-6">
          Retour à l&apos;accueil
        </ButtonLink>
      </div>
    </main>
  );
}
