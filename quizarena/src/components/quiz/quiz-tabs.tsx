import Link from "next/link";
import { cn } from "@/lib/utils";

export function QuizTabs({ quizId, active }: { quizId: string; active: "questions" | "settings" | "preview" }) {
  const tabs = [
    { key: "questions", label: "Questions", href: `/quizzes/${quizId}` },
    { key: "settings", label: "Réglages", href: `/quizzes/${quizId}/settings` },
    { key: "preview", label: "Prévisualiser", href: `/quizzes/${quizId}/preview` },
  ] as const;
  return (
    <nav aria-label="Sections du quiz" className="flex gap-1 overflow-x-auto border-b border-border">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={active === t.key ? "page" : undefined}
          className={cn(
            "-mb-px shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium",
            active === t.key ? "border-primary text-text" : "border-transparent text-text-muted hover:text-text",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
