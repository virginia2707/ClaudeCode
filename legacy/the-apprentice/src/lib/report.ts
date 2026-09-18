import { prisma } from "@/lib/prisma";
import { getAIProvider } from "@/lib/ai/ai-service";

export async function generateReport(progressId: string) {
  const progress = await prisma.progress.findUniqueOrThrow({
    where: { id: progressId },
    include: {
      simulation: true,
      userSkills: { include: { skill: true } },
      decisions: {
        include: {
          situation: true,
          choice: { include: { consequence: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const ai = getAIProvider();
  const summary = await ai.generatePerformanceSummary({
    simulationTitle: progress.simulation.title,
    globalScore: progress.score,
    skills: progress.userSkills.map((us) => ({ name: us.skill.name, score: us.score })),
  });

  const keyDecisions = [...progress.decisions]
    .sort((a, b) => Math.abs(b.choice.consequence?.xpAward ?? 0) - Math.abs(a.choice.consequence?.xpAward ?? 0))
    .slice(0, 5)
    .map((d) => ({
      situation: d.situation.title,
      choice: d.choice.text,
      impact: d.choice.consequence?.outcomeText ?? "",
    }));

  const report = await prisma.report.upsert({
    where: { progressId },
    update: {
      globalScore: progress.score,
      strengths: JSON.stringify(summary.strengths),
      improvements: JSON.stringify(summary.improvements),
      keyDecisions: JSON.stringify(keyDecisions),
      recommendation: summary.recommendation,
    },
    create: {
      progressId,
      globalScore: progress.score,
      strengths: JSON.stringify(summary.strengths),
      improvements: JSON.stringify(summary.improvements),
      keyDecisions: JSON.stringify(keyDecisions),
      recommendation: summary.recommendation,
    },
  });

  return report;
}
