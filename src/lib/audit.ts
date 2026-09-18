import "server-only";
import { prisma } from "@/lib/prisma";

export async function logAudit(input: {
  organizationId?: string | null;
  userId?: string | null;
  action: string;
  targetType: string;
  targetId: string;
  meta?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      organizationId: input.organizationId ?? null,
      userId: input.userId ?? null,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      metaJson: JSON.stringify(input.meta ?? {}),
    },
  });
}
