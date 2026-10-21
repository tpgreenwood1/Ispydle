import { createServer } from "vite";

export const PORT = 5199;

// Runs the Vite dev server (with the API middleware and .env) in-process, so it shuts down
// cleanly on every platform. Playwright's webServer leaves it orphaned on Windows.
export default async function globalSetup() {
  const server = await createServer({ server: { port: PORT, strictPort: true } });
  await server.listen();
  return async () => {
    await server.close();
  };
}
