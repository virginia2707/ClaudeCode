"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { publishQuizAction, unpublishQuizAction, deleteQuizAction, duplicateQuizAction } from "@/actions/quiz";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export function PublishControls({ quizId, status, questionCount }: { quizId: string; status: string; questionCount: number }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const published = status === "PUBLISHED";

  function run(fn: () => Promise<{ error?: string } | void>) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res && "error" in res && res.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <div className="flex flex-wrap gap-2">
        {published ? (
          <Button variant="secondary" loading={pending} onClick={() => run(() => unpublishQuizAction(quizId))}>
            Repasser en brouillon
          </Button>
        ) : (
          <Button variant="spark" loading={pending} disabled={questionCount === 0} onClick={() => run(() => publishQuizAction(quizId))}>
            Publier le quiz
          </Button>
        )}
        <Button variant="ghost" loading={pending} onClick={() => run(() => duplicateQuizAction(quizId))}>
          Dupliquer
        </Button>
        <Button
          variant="danger"
          loading={pending}
          onClick={() => {
            if (confirm("Supprimer définitivement ce quiz et toutes ses questions ?")) run(() => deleteQuizAction(quizId));
          }}
        >
          Supprimer
        </Button>
      </div>
    </div>
  );
}
