import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { StepForm, type StepFormValues } from "@/components/builder/step-form";
import { guardPage } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { parseJson } from "@/lib/json";
import { defaultConfigFor } from "@/lib/puzzles/registry";

export const metadata: Metadata = { title: "Modifier l'étape" };

export default async function StepEditorPage(props: PageProps<"/app/games/[id]/steps/[stepId]">) {
  const { id, stepId } = await props.params;
  const user = await guardPage(["TRAINER", "ADMIN"], `/app/games/${id}/steps/${stepId}`);
  const step = await prisma.gameStep.findFirst({
    where: user.role === "ADMIN" ? { id: stepId, gameId: id } : { id: stepId, gameId: id, game: { ownerId: user.id } },
    include: {
      game: { select: { id: true, title: true, ownerId: true, settings: { select: { hintPenaltyEnabled: true } } } },
      puzzle: { include: { answers: { orderBy: { createdAt: "asc" } }, hints: { orderBy: { order: "asc" } }, skills: { include: { skill: true } } } },
    },
  });
  if (!step) notFound();

  const skillLibrary = (await prisma.skill.findMany({ where: { ownerId: step.game.ownerId }, select: { name: true }, orderBy: { name: "asc" }, take: 50 })).map((s) => s.name);
  const puzzleType = step.puzzle?.type ?? "SHORT_ANSWER";
  const initial: StepFormValues = {
    title: step.title,
    description: step.description,
    instruction: step.instruction,
    content: step.content,
    imageUrl: step.imageUrl ?? "",
    fileUrl: step.fileUrl ?? "",
    fileName: step.fileName ?? "",
    videoUrl: step.videoUrl ?? "",
    unlockCode: step.unlockCode ?? "",
    points: step.points,
    recommendedSeconds: step.recommendedSeconds,
    difficulty: step.difficulty,
    isFinal: step.isFinal,
    successFeedback: step.successFeedback,
    errorFeedback: step.errorFeedback,
    explanation: step.explanation,
    puzzleType,
    prompt: step.puzzle?.prompt ?? "",
    validationMode: step.puzzle?.validationMode ?? "AUTO",
    maxAttempts: step.puzzle?.maxAttempts ?? null,
    caseSensitive: step.puzzle?.caseSensitive ?? false,
    accentSensitive: step.puzzle?.accentSensitive ?? false,
    config: parseJson<Record<string, unknown>>(step.puzzle?.config, defaultConfigFor(puzzleType) as Record<string, unknown>),
    answers: step.puzzle?.answers.map((a) => parseJson<unknown>(a.value, "")) ?? [""],
    hints: step.puzzle?.hints.map((h) => ({ text: h.text, pointCost: h.pointCost, timeCostSeconds: h.timeCostSeconds })) ?? [],
    skills: step.puzzle?.skills.map((s) => s.skill.name) ?? [],
  };

  return (
    <>
      <nav aria-label="Fil d'Ariane" className="mb-3 text-sm text-text-muted">
        <Link href={`/app/games/${step.game.id}`} className="hover:text-text">
          {step.game.title}
        </Link>{" "}
        /{" "}
        <Link href={`/app/games/${step.game.id}/steps`} className="hover:text-text">
          Étapes
        </Link>{" "}
        / <span className="text-text">{step.title || "Étape"}</span>
      </nav>
      <PageHeader title={step.title || `Étape ${step.order + 1}`} description="Contenu, énigme, indices, compétences et feedback." />
      <div className="max-w-3xl">
        <StepForm
          stepId={step.id}
          gameId={step.game.id}
          stepIndex={step.order}
          initial={initial}
          skillLibrary={skillLibrary}
          hintPenaltyEnabled={step.game.settings?.hintPenaltyEnabled ?? true}
        />
      </div>
    </>
  );
}
