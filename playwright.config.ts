import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

// Environnement distant : un Chromium est préinstallé, on l'utilise s'il existe
// au lieu de télécharger la version exacte attendue par @playwright/test.
const PRESET_CHROMIUM = process.env.PLAYWRIGHT_CHROMIUM_PATH ?? "/opt/pw-browsers/chromium";
const launchOptions = existsSync(PRESET_CHROMIUM) ? { executablePath: PRESET_CHROMIUM } : {};

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    launchOptions,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    // Base SQLite dédiée aux tests e2e : migrée puis alimentée par le seed.
    command: `npx prisma migrate deploy && npx tsx prisma/seed.ts && npx next start -p ${PORT}`,
    env: {
      DATABASE_URL: "file:./e2e.db",
      AUTH_SECRET: "e2e-secret-for-playwright-only-0123456789",
      NEXT_PUBLIC_APP_URL: `http://localhost:${PORT}`,
      // Les projets desktop et mobile sortent par la même IP : seuils relevés.
      RATE_LIMIT_LOGIN: "500",
      RATE_LIMIT_REGISTER: "500",
      RATE_LIMIT_INVITE: "500",
    },
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
