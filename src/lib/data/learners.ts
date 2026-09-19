import "server-only";
import { prisma } from "@/lib/prisma";
import type { OrgScope } from "@/lib/data/scope";

/** Apprenants de l'organisation avec un résumé de leur activité. */
export async function listLearners(scope: OrgScope, search = "") {
  const memberships = await prisma.membership.findMany({
    where: {
      organizationId: scope.organizationId,
      role: "LEARNER",
      ...(search
        ? { user: { OR: [{ name: { contains: search } }, { email: { contains: search } }] } }
        : {}),
    },
    include: { user: { select: { id: true, name: true, email: true, lastLoginAt: true } } },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  if (memberships.length === 0) return [];

  const userIds = memberships.map((m) => m.user.id);
  const progresses = await prisma.learnerProgress.groupBy({
    by: ["userId", "status"],
    where: { userId: { in: userIds }, session: { organizationId: scope.organizationId } },
    _count: { _all: true },
  });

  return memberships.map((m) => {
    const rows = progresses.filter((p) => p.userId === m.user.id);
    const byStatus = (status: string) => rows.find((r) => r.status === status)?._count._all ?? 0;
    return {
      membershipId: m.id,
      status: m.status,
      user: m.user,
      inProgress: byStatus("IN_PROGRESS"),
      completed: byStatus("COMPLETED"),
      total: rows.reduce((sum, r) => sum + r._count._all, 0),
    };
  });
}
