import { formatPoints } from "@/lib/utils";

export type FeedbackData = {
  answered: boolean;
  correct: boolean;
  accepted?: boolean;
  basePoints: number;
  speedBonus: number;
  streakBonus: number;
  multiplier: number;
  penalty: number;
  total: number;
  streakAfter: number;
};

export function FeedbackPanel({ data, explanation, showExplanation }: { data: FeedbackData; explanation: string; showExplanation: boolean }) {
  const title = !data.answered ? "Temps écoulé" : data.accepted === false ? "Réponse hors délai" : data.correct ? "Bonne réponse !" : "Mauvaise réponse";
  const tone = data.answered && data.correct && data.accepted !== false ? "text-success" : "text-danger";
  return (
    <div className="card anim-pop p-5 sm:p-6" role="status" aria-live="polite">
      <div className={`text-2xl font-black ${tone}`}>{title}</div>
      {data.answered && data.correct && data.accepted !== false ? (
        <dl className="mt-3 space-y-1 text-sm">
          <Row k="Réponse correcte" v={`+${formatPoints(data.basePoints)}`} />
          {data.speedBonus > 0 ? <Row k="Bonus rapidité" v={`+${formatPoints(data.speedBonus)}`} /> : null}
          {data.streakAfter >= 2 ? <Row k={`Série x${data.streakAfter}`} v={data.streakBonus > 0 ? `+${formatPoints(data.streakBonus)}` : "—"} /> : null}
          {data.multiplier > 1 ? <Row k="Double Points" v={`×${data.multiplier}`} /> : null}
          <div className="border-t border-border pt-2">
            <Row k="Total" v={`+${formatPoints(data.total)} points`} strong />
          </div>
        </dl>
      ) : data.answered && !data.correct ? (
        <p className="mt-2 text-sm text-text-muted">{data.penalty > 0 ? `−${formatPoints(data.penalty)} points (pénalité activée). ` : "0 point. "}La série est remise à zéro.</p>
      ) : (
        <p className="mt-2 text-sm text-text-muted">Aucun point pour cette question. La série est remise à zéro.</p>
      )}
      {showExplanation && explanation ? (
        <p className="mt-4 border-t border-border pt-3 text-sm text-text-muted">
          <span className="font-semibold text-text">Explication : </span>
          {explanation}
        </p>
      ) : null}
    </div>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${strong ? "text-base font-bold" : ""}`}>
      <dt className={strong ? "" : "text-text-muted"}>{k}</dt>
      <dd className={`tabular-nums ${strong ? "text-spark" : ""}`}>{v}</dd>
    </div>
  );
}
