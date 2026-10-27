import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

/**
 * Tests de bout en bout sur le build de production (`npm run build` d'abord),
 * avec une base PGlite neuve dans .data/e2e (données de démonstration).
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1, // base et compteurs de tentatives partagés
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  timeout: 60_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "fr-FR",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `node scripts/e2e-reset.mjs && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      DB_DRIVER: "pglite",
      PGLITE_DIR: ".data/e2e",
      APP_URL: `http://localhost:${PORT}`,
      COOKIE_INSECURE: "1",
      CRON_SECRET: "e2e",
    },
  },
});
