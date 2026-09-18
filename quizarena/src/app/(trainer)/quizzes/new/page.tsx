import type { Metadata } from "next";
import { QuizMetaForm } from "@/components/quiz/quiz-meta-form";

export const metadata: Metadata = { title: "Créer un quiz" };

export default function NewQuizPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-primary-strong">Étape 1 / 5</div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Créer un quiz</h1>
        <p className="mt-1 text-text-muted">Titre, description, catégorie et niveau. Vous ajouterez les questions à l&apos;étape suivante.</p>
      </div>
      <div className="card p-6">
        <QuizMetaForm />
      </div>
    </div>
  );
}
