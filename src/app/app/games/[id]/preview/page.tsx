import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { PreviewClient, type PreviewStep } from "@/components/builder/preview-client";
import { ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { guardPage } from "@/lib/auth/guards";
import { getOwnedGame } from "@/lib/games/queries";
import { parseJson } from "@/lib/json";
import { PUZZLE_LABELS, defaultConfigFor } from "@/lib/puzzles/registry";
import type { PuzzleType } from "@/lib/puzzles/types";

export const metadata: Metadata = { title: "Prévisualisation" };

/** Résumé lisible des réponses acceptées, pour la vue formateur uniquement. */
function summarizeAnswers(type: string, config: Record<string, unknown>, answers: unknown[]): string {
  if (answers.length === 0) return "";
  switch (type) {
    case "TRUE_FALSE":
      return answers[0] === true ? "Vrai" : "Faux";
    case "MCQ": {
      const ids = new Set(Array.isArray(answers[0]) ? (answers[0] as string[]) : []);
      const choices = (config.choices as { id: string; label: string }[]) ?? [];
      return choices.filter((c) => ids.has(c.id)).map((c) => c.label).join(" + ");
    }
    case "MATCHING": {
      const pairs = (config.pairs as { id: string; left: string; right: string }[]) ?? [];
      return pairs.map((p) => `${p.left} → ${p.right}`).join(" ; ");
    }
    case "ORDERING": {
      const items = (config.items as { id: string; label: string }[]) ?? [];
      const order = Array.isArray(answers[0]) ? (answers[0] as string[]) : [];
      return order.map((oid) => items.find((i) => i.id === oid)?.label ?? oid).join(" → ");
    }
    case "IMAGE_HOTSPOT": {
      const hotspots = (config.hotspots as { id: string; label: string }[]) ?? [];
      const ids = new Set(answers as string[]);
      return hotspots.filter((h) => ids.has(h.id)).map((h) => h.label || h.id).join(", ");
    }
    default:
      return answers.filter((a) => typeof a === "string").join(" / ");
  }
}

export default async function PreviewPage(props: PageProps<"/app/games/[id]/preview">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const user = await guardPage(["TRAINER", "ADMIN"], `/app/games/${id}/preview`);
  const game = await getOwnedGame(id, user.id, { allowAdmin: true, role: user.role });
  if (!game) notFound();

  const steps: PreviewStep[] = game.steps.map((s) => {
    const type = s.puzzle?.type ?? "SHORT_ANSWER";
    const config = parseJson<Record<string, unknown>>(s.puzzle?.config, defaultConfigFor(type) as Record<string, unknown>);
    const answers = s.puzzle?.answers.map((a) => parseJson<unknown>(a.value, "")) ?? [];
    return {
      id: s.id,
      order: s.order,
      title: s.title,
      instruction: s.instruction,
      content: s.content,
      imageUrl: s.imageUrl,
      fileUrl: s.fileUrl,
      fileName: s.fileName,
      videoUrl: s.videoUrl,
      points: s.points,
      recommendedSeconds: s.recommendedSeconds,
      unlockCode: s.unlockCode,
      isFinal: s.isFinal,
      successFeedback: s.successFeedback,
      errorFeedback: s.errorFeedback,
      explanation: s.explanation,
      puzzleType: type,
      puzzleLabel: PUZZLE_LABELS[type as PuzzleType] ?? type,
      prompt: s.puzzle?.prompt ?? "",
      config,
      hints: s.puzzle?.hints.map((h) => ({ text: h.text, pointCost: h.pointCost, timeCostSeconds: h.timeCostSeconds })) ?? [],
      skills: s.puzzle?.skills.map((ps) => ps.skill.name) ?? [],
      answerSummary: summarizeAnswers(type, config, answers),
    };
  });
  const startIndex = Number(typeof sp.step === "string" ? sp.step : 0) || 0;

  return (
    <>
      <nav aria-label="Fil d'Ariane" className="mb-3 text-sm text-text-muted">
        <Link href={`/app/games/${game.id}`} className="hover:text-text">
          {game.title}
        </Link>{" "}
        / <span className="text-text">Prévisualisation</span>
      </nav>
      <PageHeader
        title="Prévisualisation"
        description="L'écran tel que le verra l'apprenant. Aucune session n'est créée, aucun résultat n'est enregistré."
        actions={
          <>
            <ButtonLink href={`/app/games/${game.id}/steps`} variant="secondary">
              Modifier les étapes
            </ButtonLink>
            <ButtonLink href={`/app/games/${game.id}`} variant="ghost">
              Retour au jeu
            </ButtonLink>
          </>
        }
      />
      <Alert tone="info" className="mb-4">
        Mode prévisualisation : la validation des réponses, le chronomètre et le score sont désactivés.
      </Alert>
      <PreviewClient gameTitle={game.title} scenario={game.scenario} steps={steps} startIndex={startIndex} />
    </>
  );
}
