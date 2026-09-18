"use client";

import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  name: string;
  label: string;
  accept: string;
  defaultUrl?: string | null;
  defaultFileName?: string | null;
  hint?: string;
  preview?: "image" | "none";
  fileNameField?: string;
};

/** Champ fichier : envoie sur /api/uploads puis stocke l'URL dans un input caché. */
export function FileUpload({ name, label, accept, defaultUrl, defaultFileName, hint, preview = "none", fileNameField }: Props) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(defaultUrl ?? "");
  const [fileName, setFileName] = useState(defaultFileName ?? "");
  const [status, setStatus] = useState<{ tone: "info" | "danger"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const onChange = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setStatus({ tone: "info", text: "Envoi en cours…" });
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Échec de l'envoi");
      setUrl(json.url);
      setFileName(json.originalName);
      setStatus(null);
    } catch (e) {
      setStatus({ tone: "danger", text: e instanceof Error ? e.message : "Échec de l'envoi" });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      <span className="label">{label}</span>
      <input type="hidden" name={name} value={url} />
      {fileNameField ? <input type="hidden" name={fileNameField} value={fileName} /> : null}
      <div className="card-2 p-3 flex flex-col sm:flex-row sm:items-center gap-3">
        {preview === "image" && url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-16 w-24 rounded object-cover border border-border" />
        ) : null}
        <div className="min-w-0 flex-1 text-sm">
          {url ? (
            <a href={url} target="_blank" rel="noreferrer" className="text-accent hover:underline underline-offset-4 break-all">
              {fileName || url}
            </a>
          ) : (
            <span className="text-text-muted">Aucun fichier</span>
          )}
          {hint ? <div className="text-xs text-text-subtle mt-0.5">{hint}</div> : null}
          {status ? (
            <div role={status.tone === "danger" ? "alert" : "status"} className={status.tone === "danger" ? "text-xs text-danger mt-1" : "text-xs text-text-muted mt-1"}>
              {status.text}
            </div>
          ) : null}
        </div>
        <div className="flex gap-2">
          <label htmlFor={id} className="btn btn-secondary btn-sm cursor-pointer">
            {busy ? "Envoi…" : url ? "Remplacer" : "Choisir un fichier"}
          </label>
          <input ref={inputRef} id={id} type="file" accept={accept} className="sr-only" disabled={busy} onChange={(e) => onChange(e.target.files?.[0])} />
          {url ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setUrl("");
                setFileName("");
              }}
            >
              Retirer
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
