// Basic per-instance fixed-window limiter. Each serverless instance keeps its own counts,
// so this only slows casual abuse (see README).
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 120;

const windows = new Map<string, { start: number; count: number }>();

export function allowRequest(key: string, now = Date.now()): boolean {
  const w = windows.get(key);
  if (!w || now - w.start >= WINDOW_MS) {
    if (windows.size > 10_000) windows.clear();
    windows.set(key, { start: now, count: 1 });
    return true;
  }
  w.count++;
  return w.count <= MAX_REQUESTS;
}
