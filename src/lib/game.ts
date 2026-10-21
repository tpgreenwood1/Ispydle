import { MAX_GUESSES } from "../../shared/config";
import type { GameState, GuessError } from "../../shared/types";

export const EMPTY_STATE: GameState = {
  rows: [],
  knownPrefixLen: 0,
  status: "playing",
  guessesUsed: 0,
  wordLength: null,
  categoryAvailable: false,
  category: null,
  clueAvailable: false,
  clue: null,
  answer: null,
};

/** The letters shown in the top row: the first letter until a guess reveals more. */
export function knownLetters(state: GameState, firstLetter: string): string {
  if (state.status === "won" && state.answer) return state.answer;
  const best = state.rows.reduce((a, b) => (b.matched > a.matched ? b : a), {
    word: firstLetter,
    matched: 1,
  });
  return best.word.slice(0, best.matched);
}

export function errorMessage(error: GuessError, firstLetter: string): string {
  switch (error) {
    case "WRONG_FIRST_LETTER":
      return `Must start with ${firstLetter.toUpperCase()}`;
    case "NOT_IN_DICTIONARY":
      return "Not in word list";
    case "ALREADY_GUESSED":
      return "Already guessed";
    case "BAD_FORMAT":
      return "Letters only, 2 to 12 long";
  }
}

const spell = (letters: string) => letters.toUpperCase().split("").join(" ");

/** Screen-reader summary of the latest guess, e.g. "salad: S A confirmed, known prefix SA, 4 guesses left". */
export function describeGuess(prev: GameState, next: GameState, firstLetter: string): string {
  const row = next.rows.at(-1);
  if (!row) return "";
  if (next.status === "won") return `${row.word}: spotted it in ${next.guessesUsed} guesses!`;
  if (next.status === "lost") return `${row.word}: out of guesses. It was ${next.answer ?? ""}.`;

  const left = MAX_GUESSES - next.guessesUsed;
  const parts = [
    `${row.word}: ${spell(row.word.slice(0, row.matched))} confirmed`,
    `known prefix ${knownLetters(next, firstLetter).toUpperCase()}`,
    `${left} ${left === 1 ? "guess" : "guesses"} left`,
  ];
  if (prev.wordLength === null && next.wordLength !== null) {
    parts.push(`the word has ${next.wordLength} letters`);
  }
  if (!prev.categoryAvailable && next.categoryAvailable) parts.push("category hint unlocked");
  if (!prev.clueAvailable && next.clueAvailable) parts.push("clue unlocked");
  return parts.join(", ");
}
