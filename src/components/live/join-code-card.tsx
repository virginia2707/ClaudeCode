import { qrMatrix } from "@/components/live/qr-code";

/** Carte d'invitation : code de session, lien et QR code (SVG rendu côté serveur). */
export function JoinCodeCard({ code, joinUrl, compact = false }: { code: string; joinUrl: string; compact?: boolean }) {
  let matrix: number[][] | null = null;
  try {
    matrix = qrMatrix(joinUrl);
  } catch {
    matrix = null;
  }
  const size = matrix?.length ?? 0;
  const quiet = 2;
  const total = size + quiet * 2;

  return (
    <div className={compact ? "card p-4 flex items-center gap-4" : "card-glow p-6 text-center"}>
      <div className={compact ? "min-w-0 flex-1" : "mb-4"}>
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">Join EscapeClass</div>
        <div className={compact ? "mt-1 font-mono text-2xl font-bold tracking-[0.2em] text-highlight" : "mt-2 font-mono text-4xl sm:text-5xl font-bold tracking-[0.2em] text-highlight"}>
          {code}
        </div>
        <p className={compact ? "mt-1 text-xs text-text-muted break-all" : "mt-2 text-sm text-text-muted break-all"}>{joinUrl}</p>
      </div>
      {matrix ? (
        <svg
          viewBox={`0 0 ${total} ${total}`}
          role="img"
          aria-label={`QR code pour rejoindre la session avec le code ${code}`}
          shapeRendering="crispEdges"
          className={compact ? "h-24 w-24 flex-none rounded bg-white p-1" : "mx-auto h-48 w-48 rounded bg-white p-2"}
        >
          <rect width={total} height={total} fill="#ffffff" />
          {matrix.map((row, r) =>
            row.map((v, c) => (v ? <rect key={`${r}-${c}`} x={c + quiet} y={r + quiet} width={1} height={1} fill="#000000" /> : null)),
          )}
        </svg>
      ) : (
        <p className="text-xs text-text-subtle">QR code indisponible pour cette URL.</p>
      )}
    </div>
  );
}
