import { execSync } from "node:child_process";

// Runs once when the production server boots (Next.js instrumentation hook).
// Some hosts (e.g. Hostinger's Node.js app runner) invoke `next start`
// directly and never run package.json's "start" script, so migrations and
// the idempotent demo seed are applied here instead, independent of how the
// process was launched.
function run(command: string) {
  try {
    const output = execSync(command, { encoding: "utf-8" });
    if (output.trim()) console.log(output);
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    console.error(`Startup command failed: ${command}`);
    if (e.stdout) console.error("stdout:", e.stdout);
    if (e.stderr) console.error("stderr:", e.stderr);
    if (!e.stdout && !e.stderr) console.error(e.message ?? err);
    throw err;
  }
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    run("npx prisma migrate deploy");
    run("npx tsx prisma/seed.ts");
  } catch {
    // Errors are already logged by run(); don't crash the server boot.
  }
}
