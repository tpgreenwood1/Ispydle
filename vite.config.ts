import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { apiDevServer } from "./vite-plugin-api";

export default defineConfig(({ mode }) => {
  // Make DATABASE_URL and ENABLED_TIERS visible to the dev API handlers.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));
  return {
    plugins: [react(), apiDevServer()],
    // Bake the env-backed game settings in shared/config.ts into the client bundle.
    define: Object.fromEntries(
      ["MAX_WORD_LEN", "LENGTH_REVEAL_AFTER", "CATEGORY_HINT_AFTER", "CLUE_HINT_AFTER"].map(
        (key) => [`process.env.${key}`, JSON.stringify(process.env[key] ?? "")],
      ),
    ),
  };
});
