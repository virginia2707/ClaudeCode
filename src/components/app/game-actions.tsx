"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { archiveGameAction, deleteGameAction, duplicateGameAction, publishGameAction, restoreGameAction, unpublishGameAction } from "@/actions/games";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import type { ActionResult } from "@/lib/action-result";

type Props = { gameId: string; status: string; canPublish: boolean; hasSessions: boolean };

export function GameActions({ gameId, status, canPublish, hasSessions }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  const run = (fn: () => Promise<ActionResult<unknown>>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setMessage(null);
    startTransition(async () => {
      const result = await fn();
      if (!result) return; // redirection
      if (result.ok) {
        setMessage({ tone: "success", text: result.message ?? "Action effectuée." });
        router.refresh();
      } else {
        setMessage({ tone: "danger", text: result.error });
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {status === "DRAFT" ? (
          <Button onClick={() => run(() => publishGameAction(gameId))} disabled={pending || !canPublish} title={canPublish ? undefined : "Corrigez les erreurs avant de publier"}>
            Publier
          </Button>
        ) : null}
        {status === "PUBLISHED" ? (
          <Button variant="secondary" onClick={() => run(() => unpublishGameAction(gameId), "Dépublier ce jeu ? Il ne pourra plus être lancé tant qu'il est en brouillon.")} disabled={pending}>
            Dépublier
          </Button>
        ) : null}
        <Button variant="secondary" onClick={() => run(() => duplicateGameAction(gameId))} disabled={pending}>
          Dupliquer
        </Button>
        {status !== "ARCHIVED" ? (
          <Button variant="ghost" onClick={() => run(() => archiveGameAction(gameId), "Archiver ce jeu ? Il restera consultable mais ne pourra plus être lancé.")} disabled={pending}>
            Archiver
          </Button>
        ) : (
          <Button variant="secondary" onClick={() => run(() => restoreGameAction(gameId))} disabled={pending}>
            Restaurer
          </Button>
        )}
        {!hasSessions ? (
          <Button variant="danger" onClick={() => run(() => deleteGameAction(gameId), "Supprimer définitivement ce jeu et toutes ses étapes ? Cette action est irréversible.")} disabled={pending}>
            Supprimer
          </Button>
        ) : null}
      </div>
      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}
    </div>
  );
}
