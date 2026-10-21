import { defineConfig } from "@playwright/test";
import { PORT } from "./tests/e2e/global-setup";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  globalTimeout: 180_000,
  // Starts the Vite dev server (API included) against the DATABASE_URL in .env.
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  },
});
