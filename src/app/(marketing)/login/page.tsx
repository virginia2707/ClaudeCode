import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Connexion", robots: { index: false } };

export default function Page() {
  return (
    <main id="contenu" className="container-x flex flex-1 items-center justify-center py-20">
      <Card variant="elevated" className="w-full max-w-md p-8 text-center">
        <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <Icon name="lock" />
        </span>
        <p className="eyebrow mt-5">Bientôt disponible</p>
        <h1 className="h2 mt-2">Connexion</h1>
        <p className="mt-3 text-sm text-text-secondary">La connexion aux comptes Formateur, Apprenant et Admin arrive à la phase 2 (authentification et rôles).</p>
        <div className="mt-6 flex flex-col gap-2">
          <ButtonLink href="/demo">Voir la mission démo</ButtonLink>
          <ButtonLink href="/" variant="ghost">
            Retour à l&apos;accueil
          </ButtonLink>
        </div>
      </Card>
    </main>
  );
}
