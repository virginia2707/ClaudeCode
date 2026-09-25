import { cn } from "@/lib/utils";

export const ANSWER_LETTERS = ["A", "B", "C", "D"] as const;
export const ANSWER_COLORS = ["bg-answer-a", "bg-answer-b", "bg-answer-c", "bg-answer-d"] as const;
/** Shapes double the colour cue so colour is never the only signal. */
export const ANSWER_SHAPES = ["▲", "●", "■", "◆"] as const;

export type AnswerView = { id: string; text: string; hidden?: boolean };

export function QuestionCard({
  index,
  total,
  text,
  imageUrl,
  imageAlt,
  className,
}: {
  index: number;
  total: number;
  text: string;
  imageUrl?: string | null;
  imageAlt?: string | null;
  className?: string;
}) {
  return (
    <div className={cn("card anim-fade-up p-5 sm:p-7", className)}>
      <div className="text-xs font-semibold uppercase tracking-wider text-text-faint">
        Question {index + 1} / {total}
      </div>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={imageAlt || "Illustration de la question"} className="mt-4 max-h-64 w-full rounded-xl object-contain" />
      ) : null}
      <p className="mt-3 text-xl font-semibold leading-snug sm:text-2xl">{text}</p>
    </div>
  );
}

export function AnswerGrid({
  answers,
  onSelect,
  selectedId,
  correctId,
  disabled,
  compact,
}: {
  answers: AnswerView[];
  onSelect?: (id: string) => void;
  selectedId?: string | null;
  correctId?: string | null;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={cn("grid gap-3", compact ? "sm:grid-cols-2" : "sm:grid-cols-2")} role={onSelect ? "group" : undefined} aria-label="Réponses">
      {answers.map((a, i) => {
        const isSelected = selectedId === a.id;
        const revealed = correctId != null;
        const isCorrect = revealed && correctId === a.id;
        const isWrongPick = revealed && isSelected && !isCorrect;
        const content = (
          <>
            <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg text-sm font-black text-black/80", ANSWER_COLORS[i])} aria-hidden="true">
              {ANSWER_LETTERS[i]}
            </span>
            <span className="sr-only">Réponse {ANSWER_LETTERS[i]} :</span>
            <span className="flex-1 text-left text-base font-medium sm:text-lg">{a.text}</span>
            {isCorrect ? <span className="pill pill-success">Bonne réponse</span> : null}
            {isWrongPick ? <span className="pill pill-danger">Votre choix</span> : null}
            {!revealed && isSelected ? <span className="pill pill-primary">Sélectionné</span> : null}
          </>
        );
        const classes = cn(
          "card-2 flex min-h-16 items-center gap-3 px-4 py-3 transition",
          a.hidden && "opacity-30",
          isSelected && !revealed && "border-primary bg-primary-soft",
          isCorrect && "border-success bg-success-soft",
          isWrongPick && "border-danger bg-danger-soft",
        );
        if (onSelect) {
          return (
            <button
              key={a.id}
              type="button"
              className={cn(classes, "text-left enabled:hover:border-border-strong enabled:active:scale-[0.99] disabled:cursor-not-allowed")}
              onClick={() => onSelect(a.id)}
              disabled={disabled || a.hidden}
              aria-pressed={isSelected}
            >
              {content}
            </button>
          );
        }
        return (
          <div key={a.id} className={classes}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
