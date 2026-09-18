import { AlertTriangle } from "lucide-react";
import type { QuestionStat } from "@/lib/game/report";
import { formatPercent, formatSeconds, cn } from "@/lib/utils";

export function QuestionStatsTable({
  questions,
  reviewThreshold,
  hardestId,
  easiestId,
}: {
  questions: QuestionStat[];
  reviewThreshold: number;
  hardestId?: string;
  easiestId?: string;
}) {
  return (
    <div className="card overflow-x-auto p-0">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-wider text-text-faint">
          <tr>
            <th className="px-4 py-3">Question</th>
            <th className="px-4 py-3">Taux de réussite</th>
            <th className="px-4 py-3 text-right">Temps moyen</th>
            <th className="px-4 py-3 text-right">Réponses</th>
          </tr>
        </thead>
        <tbody>
          {questions.map((q) => {
            const belowThreshold = q.successRate !== null && q.successRate < reviewThreshold;
            return (
              <tr key={q.gameQuestionId} className="border-t border-border align-top">
                <td className="max-w-sm px-4 py-3">
                  <div className="flex items-start gap-2">
                    <span className="font-medium">
                      Q{q.order + 1}. {q.text}
                    </span>
                    {q.gameQuestionId === hardestId ? <span className="pill pill-danger shrink-0">Plus difficile</span> : null}
                    {q.gameQuestionId === easiestId ? <span className="pill pill-success shrink-0">Plus facile</span> : null}
                  </div>
                  {q.category ? <div className="mt-1 text-xs text-text-faint">{q.category}</div> : null}
                </td>
                <td className="px-4 py-3">
                  {q.successRate === null ? (
                    <span className="text-text-faint">Aucune réponse</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="timer-track w-28" aria-hidden="true">
                        <div
                          className="timer-fill"
                          data-urgent={belowThreshold}
                          style={{ width: `${q.successRate * 100}%` }}
                        />
                      </div>
                      <span className={cn("tabular-nums", belowThreshold && "text-danger")}>{formatPercent(q.successRate)}</span>
                      {belowThreshold ? <AlertTriangle className="size-3.5 text-danger" aria-label="Sous le seuil de révision" /> : null}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{q.totalAnswers > 0 ? formatSeconds(q.avgResponseMs) : "—"}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {q.correctAnswers} / {q.totalAnswers}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
