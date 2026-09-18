import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";

/** Create a fresh SQLite database for integration tests. */
export default function setup() {
  const db = path.resolve(__dirname, "../prisma/test.db");
  rmSync(db, { force: true });
  rmSync(`${db}-journal`, { force: true });
  execSync("npx prisma migrate deploy", {
    cwd: path.resolve(__dirname, ".."),
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
    stdio: "pipe",
  });
}
