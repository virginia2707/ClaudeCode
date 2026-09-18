import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export default function NotFound() {
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-4">
      <div className="card max-w-md p-8 text-center">
        <Logo className="justify-center" />
        <h1 className="mt-6 text-2xl font-bold">Page introuvable</h1>
        <p className="mt-2 text-text-muted">Cette page n&apos;existe pas ou n&apos;est plus disponible.</p>
        <ButtonLink href="/" className="mt-6">
          Retour à l&apos;accueil
        </ButtonLink>
      </div>
    </main>
  );
}
