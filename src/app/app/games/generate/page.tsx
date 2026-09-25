import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { AIGenerateForm } from "@/components/builder/ai-form";
import { Alert } from "@/components/ui/alert";
import { guardPage } from "@/lib/auth/guards";
import { canCreateGame } from "@/lib/plans-guard";
import { currentProviderName } from "@/lib/ai/ai-service";

export const metadata: Metadata = { title: "Générer avec l'IA" };

export default async function GenerateGamePage() {
  const user = await guardPage(["TRAINER", "ADMIN"], "/app/games/generate");
  const allowed = await canCreateGame(user);
  const provider = currentProviderName();

  return (
    <>
      <nav aria-label="Fil d'Ariane" className="mb-3 text-sm text-text-muted">
        <Link href="/app/games" className="hover:text-text">
          Mes Escape Games
        </Link>{" "}
        / <span className="text-text">Générer avec l&apos;IA</span>
      </nav>
      <PageHeader
        title="Générer avec l'IA"
        description="Décrivez votre formation : l'IA propose un scénario, des étapes, des énigmes, des indices, des feedbacks et des compétences."
      />
      {!allowed.ok ? <Alert tone="warning" className="mb-4">{allowed.error}</Alert> : null}
      {provider === "stub" ? (
        <Alert tone="info" className="mb-4">
          Générateur hors-ligne actif (aucune clé d&apos;API requise). Pour utiliser un modèle Claude, définissez
          <span className="font-mono"> AI_PROVIDER=anthropic</span> et <span className="font-mono">ANTHROPIC_API_KEY</span>.
        </Alert>
      ) : null}
      <div className="max-w-3xl">
        <AIGenerateForm providerName={provider} />
      </div>
    </>
  );
}
