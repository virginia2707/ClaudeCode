// Runs once when the production server boots (Next.js instrumentation hook).
// Some hosts (e.g. Hostinger's Node.js app runner) invoke `next start`
// directly and never run package.json's "start" script, so the schema
// bootstrap and the idempotent demo seed are applied here instead,
// independent of how the process was launched.
//
// This calls into @prisma/client and the seed module directly (rather than
// shelling out to the `prisma`/`tsx` CLIs) because some hosts only ship the
// node_modules their build tracer can see through static imports — a CLI
// package that's never `import`-ed from app code gets pruned even when
// listed as a regular dependency. See src/lib/db-bootstrap.ts for the
// schema bootstrap itself.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { prisma } = await import("@/lib/prisma");
    const { bootstrapDatabase } = await import("@/lib/db-bootstrap");
    const { runSeed } = await import("../prisma/seed");

    await bootstrapDatabase(prisma);
    await runSeed(prisma);
  } catch (err) {
    console.error("Startup database bootstrap/seed failed:", err);
  }
}
