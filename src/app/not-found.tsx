import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="contenu" className="container-x flex flex-1 flex-col items-center justify-center py-24 text-center">
      <p className="eyebrow mb-3">Erreur 404</p>
      <h1 className="h1">Cette page n&apos;existe pas.</h1>
      <p className="lead mt-4 max-w-md">Le briefing que vous cherchez a peut-être été déplacé ou n&apos;est pas encore publié.</p>
      <ButtonLink href="/" className="mt-8">
        Retour à l&apos;accueil
      </ButtonLink>
    </main>
  );
}
