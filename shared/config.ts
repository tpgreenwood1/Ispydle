// Game constants (spec §1). ENABLED_TIERS is read from env on the server: see enabledTiers() in api/_lib/http.ts.
export const MAX_GUESSES = 6;
export const MAX_WORD_LEN = 7;
export const MIN_WORD_LEN = 3;
export const LENGTH_REVEAL_AFTER = 3;
export const CATEGORY_HINT_AFTER = 5;
export const MIN_GUESS_LEN = 2;
export const MAX_GUESS_LEN = 12;
export const DEFAULT_ENABLED_TIERS = [1];
