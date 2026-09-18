import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { SkillsManager } from "@/components/app/skills-manager";
import { guardPage } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Compétences" };

export default async function SkillsPage() {
  const user = await guardPage(["TRAINER", "ADMIN"], "/app/skills");
  const rows = await prisma.skill.findMany({ where: { ownerId: user.id }, include: { _count: { select: { puzzles: true } } }, orderBy: [{ category: "asc" }, { name: "asc" }] });
  const skills = rows.map((s) => ({ id: s.id, name: s.name, description: s.description, category: s.category, usage: s._count.puzzles }));
  return (
    <>
      <PageHeader title="Compétences" description="Votre bibliothèque de compétences, réutilisable dans tous vos Escape Games." />
      <SkillsManager skills={skills} />
    </>
  );
}
