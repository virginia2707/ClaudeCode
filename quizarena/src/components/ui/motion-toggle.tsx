"use client";

import { useSyncExternalStore } from "react";
import { Sparkles } from "lucide-react";

const KEY = "qa:motion";
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === "reduced";
  } catch {
    return false;
  }
}

function apply(reduced: boolean) {
  if (reduced) document.documentElement.dataset.motion = "reduced";
  else delete document.documentElement.dataset.motion;
}

function write(reduced: boolean) {
  try {
    localStorage.setItem(KEY, reduced ? "reduced" : "full");
  } catch {
    /* storage unavailable */
  }
  apply(reduced);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Apply the persisted preference on first subscription (after hydration).
  apply(read());
  return () => listeners.delete(listener);
}

/** Lets the person disable animations app-wide (persisted per browser). */
export function MotionToggle({ className }: { className?: string }) {
  const reduced = useSyncExternalStore(subscribe, read, () => false);

  return (
    <button
      type="button"
      onClick={() => write(!reduced)}
      className={className ?? "btn btn-ghost btn-sm"}
      aria-pressed={reduced}
      title={reduced ? "Réactiver les animations" : "Réduire les animations"}
    >
      <Sparkles className="size-4" aria-hidden="true" />
      <span>{reduced ? "Animations : réduites" : "Animations : activées"}</span>
    </button>
  );
}
