import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Mes parties" };

// Placeholder — real game list arrives in Phase 4.
export default function GamesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Mes parties</h1>
      <EmptyState title="Les parties arrivent dans la phase suivante" description="Publiez un quiz pour pouvoir lancer une partie." action={<ButtonLink href="/quizzes">Voir mes quiz</ButtonLink>} />
    </div>
  );
}
