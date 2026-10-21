import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema.js";

// Fail a stalled query fast and retry once, instead of waiting for the platform's
// minutes-long fetch timeout. All queries are reads or idempotent upserts, so a retry is safe.
const ATTEMPT_TIMEOUT_MS = 6_000;
const ATTEMPTS = 2;
neonConfig.fetchFunction = async (input: RequestInfo | URL, init?: RequestInit) => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fetch(input, { ...init, signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS) });
    } catch (err) {
      if (attempt >= ATTEMPTS) throw err;
    }
  }
};

export function createDb(url = process.env.DATABASE_URL) {
  if (!url) throw new Error("DATABASE_URL is not set");
  return drizzle(neon(url), { schema });
}

export type Db = ReturnType<typeof createDb>;
