export type GameStatus = "playing" | "won" | "lost";

export type GuessError =
  "NOT_IN_DICTIONARY" | "WRONG_FIRST_LETTER" | "ALREADY_GUESSED" | "BAD_FORMAT";

export interface Row {
  word: string;
  matched: number;
}

export interface GameState {
  rows: Row[];
  knownPrefixLen: number;
  status: GameStatus;
  guessesUsed: number;
  wordLength: number | null;
  categoryAvailable: boolean;
  category: string | null;
  clueAvailable: boolean;
  clue: string | null;
  answer: string | null;
}

export interface PuzzleInfo {
  puzzleNo: number;
  firstLetter: string;
}

export interface GuessRequest {
  guesses: string[];
  revealCategory?: boolean;
  revealClue?: boolean;
}

export type GuessResponse = { valid: true; state: GameState } | { valid: false; error: GuessError };
