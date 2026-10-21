import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin, ViteDevServer } from "vite";

// Dev-only: serves /api/* with the same handlers Vercel deploys.
const routes: [pattern: RegExp, module: string][] = [
  [/^\/api\/puzzles\/random$/, "/api/puzzles/random.ts"],
  [/^\/api\/puzzles\/\d+\/guess$/, "/api/puzzles/[puzzleNo]/guess.ts"],
  [/^\/api\/puzzles\/\d+$/, "/api/puzzles/[puzzleNo].ts"],
  [/^\/api\/share-image$/, "/api/share-image.ts"],
  [/^\/api\/share-clicked$/, "/api/share-clicked.ts"],
  [/^\/api\/page$/, "/api/page.ts"],
];

type Handler = (req: Request) => Promise<Response>;

async function readBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

async function handle(server: ViteDevServer, req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? "/", "http://localhost");
  const route = routes.find(([pattern]) => pattern.test(url.pathname));
  if (!route) {
    res.statusCode = 404;
    res.end();
    return;
  }

  const mod = (await server.ssrLoadModule(route[1])) as Record<string, Handler | undefined>;
  const handler = mod[req.method ?? "GET"];
  if (!handler) {
    res.statusCode = 405;
    res.end();
    return;
  }

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === "string") headers.set(key, value);
  }
  headers.set("x-forwarded-for", req.socket.remoteAddress ?? "unknown");
  const body = req.method === "GET" || req.method === "HEAD" ? undefined : await readBody(req);

  const response = await handler(new Request(url, { method: req.method, headers, body }));
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.end(Buffer.from(await response.arrayBuffer()));
}

export function apiDevServer(): Plugin {
  return {
    name: "ispydle-api-dev",
    configureServer(server) {
      server.middlewares.use("/api", (req, res) => {
        // Connect strips the "/api" mount path; restore it for the handlers.
        req.url = `/api${req.url ?? ""}`;
        handle(server, req, res).catch((err: unknown) => {
          // Answer like a crashed function would, rather than Vite's error overlay.
          server.config.logger.error(String(err));
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Internal error" }));
        });
      });
    },
  };
}
