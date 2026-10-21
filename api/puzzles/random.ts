import type { PuzzleInfo } from "../../shared/types.js";
import { enabledTiers, error, json, rateLimited, withErrors } from "../_lib/http.js";
import { randomPuzzle } from "../_lib/queries.js";

const MAX_EXCLUDE = 1000;

export const GET = withErrors(async (req) => {
  const limited = rateLimited(req);
  if (limited) return limited;

  const exclude = (new URL(req.url).searchParams.get("exclude") ?? "")
    .split(",")
    .filter((s) => /^\d{1,9}$/.test(s))
    .map(Number)
    .slice(0, MAX_EXCLUDE);

  const puzzle = await randomPuzzle(enabledTiers(), exclude);
  if (!puzzle) return error(404, "No puzzles available");
  return json({
    puzzleNo: puzzle.puzzleNo,
    firstLetter: puzzle.word.charAt(0),
  } satisfies PuzzleInfo);
});
