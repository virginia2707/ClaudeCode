import { prisma } from "@/lib/prisma";

export function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "escape-game";
}

/** Génère un slug unique pour un EscapeGame. */
export async function uniqueGameSlug(title: string) {
  const base = slugify(title);
  let candidate = base;
  for (let i = 0; i < 20; i++) {
    const exists = await prisma.escapeGame.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!exists) return candidate;
    candidate = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}
