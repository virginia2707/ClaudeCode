"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CodePanel({ code, joinUrl }: { code: string; joinUrl: string }) {
  const [copied, setCopied] = useState<"code" | "url" | null>(null);
  async function copy(kind: "code" | "url", text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      /* clipboard unavailable */
    }
  }
  const host = joinUrl.replace(/^https?:\/\//, "").replace(/\?.*$/, "");
  return (
    <div className="card relative overflow-hidden p-6 text-center sm:p-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(40rem_16rem_at_50%_-30%,rgba(124,108,255,0.28),transparent)]" />
      <div className="relative">
        <div className="text-xs font-bold uppercase tracking-[0.3em] text-primary-strong">Join the arena</div>
        <p className="mt-3 text-sm text-text-muted">
          Rendez-vous sur <span className="font-semibold text-text">{host}</span> et saisissez le code :
        </p>
        <div className="code-display mt-4 text-5xl text-spark sm:text-7xl" aria-label={`Code de partie ${code.split("").join(" ")}`}>
          {code}
        </div>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <button type="button" className="btn btn-secondary" onClick={() => copy("code", code)}>
            {copied === "code" ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
            {copied === "code" ? "Code copié" : "Copier le code"}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => copy("url", joinUrl)}>
            {copied === "url" ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
            {copied === "url" ? "Lien copié" : "Copier le lien d'invitation"}
          </button>
        </div>
      </div>
    </div>
  );
}
