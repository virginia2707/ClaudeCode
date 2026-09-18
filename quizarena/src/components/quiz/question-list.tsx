import Link from "next/link";
import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import { deleteQuestionAction, moveQuestionAction } from "@/actions/question";
import { Pill } from "@/components/ui/pill";
import { DIFFICULTY_LABELS, type Difficulty } from "@/lib/constants";
import type { OwnedQuiz } from "@/lib/quiz/access";
import { cn } from "@/lib/utils";

const LETTERS = ["A", "B", "C", "D"];

export function QuestionList({ quiz }: { quiz: OwnedQuiz }) {
  return (
    <ol className="space-y-3">
      {quiz.questions.map((q, i) => (
        <li key={q.id} className="card p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
                <span className="font-semibold text-text">Question {i + 1}</span>
                <Pill>{DIFFICULTY_LABELS[q.difficulty as Difficulty] ?? q.difficulty}</Pill>
                <Pill>{q.timeLimit} s</Pill>
                <Pill tone="spark">{q.points} pts</Pill>
                {q.category ? <Pill tone="info">{q.category}</Pill> : null}
                {q.skills.map((s) => (
                  <Pill key={s.skillId} tone="primary">
                    {s.skill.name}
                  </Pill>
                ))}
              </div>
              <p className="mt-2 font-medium">{q.text}</p>
              <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                {q.answers.map((a, ai) => (
                  <li key={a.id} className={cn("flex items-center gap-2", a.isCorrect ? "text-success" : "text-text-muted")}>
                    <span className="w-4 font-bold">{LETTERS[ai]}</span>
                    <span className="truncate">{a.text}</span>
                    {a.isCorrect ? <span className="sr-only">(bonne réponse)</span> : null}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <form action={moveQuestionAction.bind(null, quiz.id, q.id, "up")}>
                <button className="btn btn-ghost btn-sm" disabled={i === 0} aria-label={`Monter la question ${i + 1}`}>
                  <ArrowUp className="size-4" aria-hidden="true" />
                </button>
              </form>
              <form action={moveQuestionAction.bind(null, quiz.id, q.id, "down")}>
                <button className="btn btn-ghost btn-sm" disabled={i === quiz.questions.length - 1} aria-label={`Descendre la question ${i + 1}`}>
                  <ArrowDown className="size-4" aria-hidden="true" />
                </button>
              </form>
              <Link href={`/quizzes/${quiz.id}/questions/${q.id}`} className="btn btn-secondary btn-sm" aria-label={`Modifier la question ${i + 1}`}>
                <Pencil className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">Modifier</span>
              </Link>
              <form action={deleteQuestionAction.bind(null, quiz.id, q.id)}>
                <button className="btn btn-danger btn-sm" aria-label={`Supprimer la question ${i + 1}`}>
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </form>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
