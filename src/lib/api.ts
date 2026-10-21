import type { GuessResponse, PuzzleInfo } from "../../shared/types";

/** Longer than the server's own retry budget, so the server gets to answer first. */
const REQUEST_TIMEOUT_MS = 15_000;

export class HttpError extends Error {
  constructor(readonly status: number) {
    super(`HTTP ${status}`);
  }
}

/** The request never got an answer: no connection, or it took too long. */
export class NetworkError extends Error {
  constructor(readonly kind: "offline" | "timeout") {
    super(kind);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!navigator.onLine) throw new NetworkError("offline");
  let res: Response;
  try {
    res = await fetch(path, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch (err) {
    throw new NetworkError((err as Error).name === "TimeoutError" ? "timeout" : "offline");
  }
  if (!res.ok) throw new HttpError(res.status);
  return (await res.json()) as T;
}

/** A short, friendly message for any failed request. */
export function failureMessage(err: unknown): string {
  if (err instanceof NetworkError) {
    return err.kind === "offline"
      ? "No connection. Check your signal and try again."
      : "That took too long. Try again.";
  }
  if (err instanceof HttpError && err.status === 429) return "Too many tries. Wait a moment.";
  return "Something went wrong. Try again.";
}

export const fetchPuzzle = (puzzleNo: number) => request<PuzzleInfo>(`/api/puzzles/${puzzleNo}`);

export const fetchRandom = (exclude: number[]) =>
  request<PuzzleInfo>(
    `/api/puzzles/random${exclude.length ? `?exclude=${exclude.join(",")}` : ""}`,
  );

export const postGuesses = (puzzleNo: number, guesses: string[], revealCategory: boolean) =>
  request<GuessResponse>(`/api/puzzles/${puzzleNo}/guess`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ guesses, revealCategory }),
  });
