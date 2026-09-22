import "server-only";
import { PrismaClient } from "@prisma/client";
import { INIT_SQL_STATEMENTS } from "@/lib/init-sql-statements";

/**
 * One-time schema bootstrap, run from the server-boot instrumentation hook.
 *
 * Some hosts (Hostinger's Next.js runtime included) only ship the
 * node_modules their build tracer can see through static imports — the
 * `prisma` CLI package itself is pruned away even when listed as a regular
 * dependency, because nothing in the traced app code imports it (it's only
 * ever invoked as a CLI). `prisma migrate deploy` can't run there, so the
 * generated init migration is replayed here through `@prisma/client`
 * instead, guarded by a check so it only runs against a genuinely empty
 * database. This is a one-time bootstrap, not a general migration runner —
 * future schema changes need a different mechanism (e.g. a host with a
 * working `prisma` CLI at runtime, or a new guarded bootstrap step).
 */
export async function bootstrapDatabase(prisma: PrismaClient) {
  const alreadyInitialized = await tableExists(prisma, "User");
  if (alreadyInitialized) return;

  console.log("Database not initialized yet — running one-time schema bootstrap.");
  for (const statement of INIT_SQL_STATEMENTS) {
    await prisma.$executeRawUnsafe(statement);
  }
  console.log(`Schema bootstrap complete (${INIT_SQL_STATEMENTS.length} statements).`);
}

async function tableExists(prisma: PrismaClient, tableName: string) {
  const rows = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?",
    tableName
  );
  return Number(rows[0]?.count ?? 0) > 0;
}
