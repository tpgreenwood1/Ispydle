// shared/config.ts reads process.env; Vite replaces those reads in the client (see vite.config.ts).
declare const process: { env: Record<string, string | undefined> };
