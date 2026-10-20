import { MAX_GUESS_LEN, MIN_GUESS_LEN } from "./config.js";
import type { GuessError } from "./types.js";

const LETTERS = /^[a-z]+$/;

export function isWellFormed(guess: string): boolean {
  return LETTERS.test(guess) && guess.length >= MIN_GUESS_LEN && guess.length <= MAX_GUESS_LEN;
}

/** Returns why `guess` is invalid, or null if it is a valid guess. */
export function validateGuess(
  guess: string,
  firstLetter: string,
  priorGuesses: readonly string[],
  inDictionary: (word: string) => boolean,
): GuessError | null {
  if (!isWellFormed(guess)) return "BAD_FORMAT";
  if (guess[0] !== firstLetter) return "WRONG_FIRST_LETTER";
  if (!inDictionary(guess)) return "NOT_IN_DICTIONARY";
  if (priorGuesses.includes(guess)) return "ALREADY_GUESSED";
  return null;
}
