"use client";

import { useState, useTransition } from "react";
import { createDemoGameAction } from "@/actions/game";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export function DemoLauncher() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <Button
        variant="spark"
        size="lg"
        loading={pending}
        onClick={() =>
          start(async () => {
            const res = await createDemoGameAction();
            if (res?.error) setError(res.error);
          })
        }
      >
        Lancer une partie de démonstration
      </Button>
    </div>
  );
}
