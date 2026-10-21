import { MAX_GUESSES } from "../../../shared/config.js";
import { evaluateGuesses } from "../../../shared/evaluate.js";
import type { GuessResponse } from "../../../shared/types.js";
import { isWellFormed, validateGuess } from "../../../shared/validateGuess.js";
import {
  MAX_BODY_BYTES,
  error,
  json,
  puzzleNoFromUrl,
  rateLimited,
  withErrors,
} from "../../_lib/http.js";
import { dictionaryHas, getPuzzle } from "../../_lib/queries.js";

interface Body {
  guesses: string[];
  revealCategory: boolean;
  revealClue: boolean;
}

function parseBody(text: string): Body | null {
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof body !== "object" || body === null) return null;
  const { guesses, revealCategory, revealClue } = body as Record<string, unknown>;
  if (!Array.isArray(guesses) || !guesses.every((g) => typeof g === "string")) return null;
  if (revealCategory !== undefined && typeof revealCategory !== "boolean") return null;
  if (revealClue !== undefined && typeof revealClue !== "boolean") return null;
  // Guesses are case-insensitive: "Spoon" and "spoon" are the same guess.
  return {
    guesses: guesses.map((g: string) => g.trim().toLowerCase()),
    revealCategory: revealCategory ?? false,
    revealClue: revealClue ?? false,
  };
}

export const POST = withErrors(async (req) => {
  const limited = rateLimited(req);
  if (limited) return limited;

  const puzzleNo = puzzleNoFromUrl(req.url);
  if (puzzleNo === null) return error(404, "Puzzle not found");

  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) return error(413, "Body too large");
  const body = parseBody(text);
  if (!body) {
    return error(
      400,
      "Body must be { guesses: string[], revealCategory?: boolean, revealClue?: boolean }",
    );
  }
  const { guesses, revealCategory, revealClue } = body;
  if (guesses.length > MAX_GUESSES) return error(400, `At most ${MAX_GUESSES} guesses`);

  const [puzzle, known] = await Promise.all([
    getPuzzle(puzzleNo),
    dictionaryHas(guesses.filter(isWellFormed)),
  ]);
  if (!puzzle) return error(404, "Puzzle not found");

  // A guess after the winning guess means the client is out of sync.
  const winAt = guesses.indexOf(puzzle.word);
  if (winAt !== -1 && winAt < guesses.length - 1) return error(400, "Game already won");

  const firstLetter = puzzle.word.charAt(0);
  for (const [i, guess] of guesses.entries()) {
    const err = validateGuess(guess, firstLetter, guesses.slice(0, i), (w) => known.has(w));
    if (!err) continue;
    if (i < guesses.length - 1) return error(400, `Invalid earlier guess at index ${i}`);
    return json({ valid: false, error: err } satisfies GuessResponse);
  }

  const state = evaluateGuesses(puzzle.word, puzzle, guesses, {
    category: revealCategory,
    clue: revealClue,
  });
  return json({ valid: true, state } satisfies GuessResponse);
});
