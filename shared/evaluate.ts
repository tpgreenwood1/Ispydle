import {
  CATEGORY_HINT_AFTER,
  LAST_CHANCE_GUESSES,
  LENGTH_REVEAL_AFTER,
  MAX_GUESSES,
} from "./config.js";
import type { GameState, GameStatus, Row } from "./types.js";

export function commonPrefixLen(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

export interface Hints {
  category: string;
  /** null until the puzzle has been re-seeded with a clue. */
  clue: string | null;
}

/** Which unlocked hints the player has asked to see. */
export interface Reveal {
  category?: boolean;
  /** Takes the last chance: shows the clue and allows one more guess. */
  clue?: boolean;
  /** Declines the last chance, ending the game. */
  giveUp?: boolean;
}

/**
 * Evaluates an already-validated, ordered list of guesses against the answer.
 * This is the only implementation of the game rules.
 */
export function evaluateGuesses(
  answer: string,
  hints: Hints,
  guesses: readonly string[],
  reveal: Reveal = {},
): GameState {
  const rows: Row[] = guesses.map((word) => ({ word, matched: commonPrefixLen(word, answer) }));
  const knownPrefixLen = rows.reduce((max, r) => Math.max(max, r.matched), 0);
  const guessesUsed = rows.length;

  // After MAX_GUESSES misses the last chance (the clue plus one more guess) is on offer,
  // unless the puzzle has no clue or the player gives up.
  const lastChance = hints.clue !== null && !reveal.giveUp;
  let status: GameStatus = "playing";
  if (guesses.includes(answer)) status = "won";
  else if (guessesUsed >= (lastChance ? LAST_CHANCE_GUESSES : MAX_GUESSES)) status = "lost";
  const ended = status !== "playing";

  const categoryAvailable = guessesUsed >= CATEGORY_HINT_AFTER;
  const clueAvailable = hints.clue !== null && guessesUsed >= MAX_GUESSES;

  return {
    rows,
    knownPrefixLen,
    status,
    guessesUsed,
    wordLength: ended || guessesUsed >= LENGTH_REVEAL_AFTER ? answer.length : null,
    categoryAvailable,
    category: ended || (categoryAvailable && reveal.category) ? hints.category : null,
    clueAvailable,
    clue: ended || (clueAvailable && reveal.clue) ? hints.clue : null,
    answer: ended ? answer : null,
  };
}
