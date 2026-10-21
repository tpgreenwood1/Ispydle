// Game constants (spec §1). ENABLED_TIERS is read from env on the server: see enabledTiers() in api/_lib/http.ts.
// The env-backed values below are read at runtime on the server and baked into the client at
// build time (see vite.config.ts), so change them in env and redeploy.
const envInt = (value: string | undefined, fallback: number) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};

export const MAX_GUESSES = 6;
export const MAX_WORD_LEN = envInt(process.env.MAX_WORD_LEN, 6);
export const MIN_WORD_LEN = 3;
export const LENGTH_REVEAL_AFTER = envInt(process.env.LENGTH_REVEAL_AFTER, 2);
export const CATEGORY_HINT_AFTER = envInt(process.env.CATEGORY_HINT_AFTER, 3);
export const CLUE_HINT_AFTER = envInt(process.env.CLUE_HINT_AFTER, 4);
export const MIN_GUESS_LEN = 2;
export const MAX_GUESS_LEN = 12;
export const DEFAULT_ENABLED_TIERS = [1];
