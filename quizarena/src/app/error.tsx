"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[QuizArena] Unhandled error", error);
  }, [error]);

  return (
    <main id="main" tabIndex={-1} className="grid min-h-dvh place-items-center px-4">
      <div className="card max-w-md p-8 text-center">
        <h1 className="text-2xl font-bold">Une erreur est survenue</h1>
        <p className="mt-2 text-text-muted">Réessayez. Si le problème persiste, rechargez la page.</p>
        <Button className="mt-6" onClick={reset}>
          Réessayer
        </Button>
      </div>
    </main>
  );
}
