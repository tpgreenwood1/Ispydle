import { DEFAULT_ENABLED_TIERS } from "../../shared/config.js";
import { allowRequest } from "./rateLimit.js";

export const MAX_BODY_BYTES = 2048;

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export const error = (status: number, message: string) => json({ error: message }, status);

/** Returns a 429 response if the caller is over the rate limit, else null. */
export function rateLimited(req: Request): Response | null {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  return allowRequest(ip) ? null : error(429, "Too many requests");
}

/** Parses the `:puzzleNo` path segment that follows /api/puzzles/. */
export function puzzleNoFromUrl(url: string): number | null {
  const match = /^\/api\/puzzles\/(\d{1,9})(?:\/|$)/.exec(new URL(url).pathname);
  return match?.[1] ? Number(match[1]) : null;
}

export function enabledTiers(): number[] {
  const tiers = (process.env.ENABLED_TIERS ?? "")
    .split(",")
    .map((t) => Number(t.trim()))
    .filter((t) => [1, 2, 3].includes(t));
  return tiers.length ? tiers : DEFAULT_ENABLED_TIERS;
}
