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
    // Avoid `npx` (not reliably on PATH in every host's runtime process) and
    // avoid node_modules/.bin symlinks (some deploy pipelines don't preserve
    // symlinks when promoting a build to its serving location) by invoking
    // each CLI's real entry file directly with the current Node binary.
    const node = process.execPath;
    run(`${node} node_modules/prisma/build/index.js migrate deploy`);
    run(`${node} node_modules/tsx/dist/cli.mjs prisma/seed.ts`);
  } catch {
    // Errors are already logged by run(); don't crash the server boot.
  }
}
