import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { apiDevServer } from "./vite-plugin-api";

export default defineConfig(({ mode }) => {
  // Make DATABASE_URL and ENABLED_TIERS visible to the dev API handlers.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));
  return {
    plugins: [react(), apiDevServer()],
  };
});
