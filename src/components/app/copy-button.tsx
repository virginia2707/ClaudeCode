"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyButton({ value, label = "Copier le lien" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          window.prompt("Copiez ce lien :", value);
        }
      }}
    >
      {copied ? "Copié !" : label}
    </Button>
  );
}
