import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Générer avec IA" };

// Placeholder — AI generation arrives in Phase 11.
export default async function GeneratePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-2xl">
      <EmptyState title="Génération IA à venir" description="La génération de questions par IA arrive dans une phase ultérieure. Les questions générées seront toujours relues avant publication." action={<ButtonLink href={`/quizzes/${id}`}>Retour au quiz</ButtonLink>} />
    </div>
  );
}
