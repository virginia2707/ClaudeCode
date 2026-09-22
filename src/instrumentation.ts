import { execSync } from "node:child_process";

// Runs once when the production server boots (Next.js instrumentation hook).
// Some hosts (e.g. Hostinger's Node.js app runner) invoke `next start`
// directly and never run package.json's "start" script, so migrations and
// the idempotent demo seed are applied here instead, independent of how the
// process was launched.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    execSync("npx prisma migrate deploy", { stdio: "inherit" });
    execSync("npx tsx prisma/seed.ts", { stdio: "inherit" });
  } catch (err) {
    console.error("Startup migration/seed failed:", err);
  }
}
