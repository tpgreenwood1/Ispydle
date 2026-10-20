import type { PuzzleInfo } from "../../shared/types.js";
import { error, json, puzzleNoFromUrl, rateLimited } from "../_lib/http.js";
import { getPuzzle } from "../_lib/queries.js";

export async function GET(req: Request): Promise<Response> {
  const limited = rateLimited(req);
  if (limited) return limited;

  const puzzleNo = puzzleNoFromUrl(req.url);
  const puzzle = puzzleNo === null ? null : await getPuzzle(puzzleNo);
  if (!puzzle) return error(404, "Puzzle not found");
  return json({
    puzzleNo: puzzle.puzzleNo,
    firstLetter: puzzle.word.charAt(0),
  } satisfies PuzzleInfo);
}
