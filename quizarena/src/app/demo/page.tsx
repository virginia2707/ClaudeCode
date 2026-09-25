import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";
import { prisma } from "@/lib/db/prisma";
import { DemoLauncher } from "@/components/host/demo-launcher";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Démonstration" };

export default async function DemoPage() {
  const demoQuiz = await prisma.quiz.findFirst({
    where: { isDemo: true, status: "PUBLISHED" },
    include: { _count: { select: { questions: true } } },
  });
  return (
    <>
      <AppHeader />
      <main id="main" tabIndex={-1} className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-primary-strong">Try Demo</div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Essayez QuizArena sans compte</h1>
        <p className="mt-3 text-text-muted">
          Lancez une partie de démonstration sur le quiz <strong className="text-text">« {demoQuiz?.title ?? "Les fondamentaux de l'IA"} »</strong>
          {demoQuiz ? ` (${demoQuiz._count.questions} questions)` : ""}. Vous obtenez un code, vos collègues rejoignent depuis leur téléphone, et vous
          pilotez la partie depuis cet écran. Les données de démonstration peuvent être supprimées automatiquement.
        </p>
        <div className="card mt-8 p-6">
          {demoQuiz ? <DemoLauncher /> : <p className="text-text-muted">Le quiz de démonstration n&apos;est pas encore disponible.</p>}
          <p className="mt-4 text-sm text-text-muted">
            Vous voulez créer vos propres quiz ?{" "}
            <ButtonLink href="/register" variant="ghost" size="sm">
              Créer un compte
            </ButtonLink>
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
