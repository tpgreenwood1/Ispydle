// Game constants (spec §1). ENABLED_TIERS is read from env on the server: see enabledTiers() in api/_lib/http.ts.
// The env-backed values below are read at runtime on the server and baked into the client at
// build time (see vite.config.ts), so change them in env and redeploy.
const envInt = (value: string | undefined, fallback: number) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};

export const MAX_GUESSES = 6;
/** After MAX_GUESSES misses the player may take one more guess with the clue shown. */
export const LAST_CHANCE_GUESSES = MAX_GUESSES + 1;
export const MAX_WORD_LEN = envInt(process.env.MAX_WORD_LEN, 6);
export const MIN_WORD_LEN = 3;
export const LENGTH_REVEAL_AFTER = envInt(process.env.LENGTH_REVEAL_AFTER, 2);
export const CATEGORY_HINT_AFTER = envInt(process.env.CATEGORY_HINT_AFTER, 3);
export const MIN_GUESS_LEN = 2;
export const MAX_GUESS_LEN = 12;
export const DEFAULT_ENABLED_TIERS = [1];

// Share rating titles (share-spec §2). A win takes the first row whose `upTo` covers its guess count.
export const SHARE_WIN_RATINGS = [
  { upTo: 2, title: "Eagle eyes", emoji: "🦅" },
  { upTo: 5, title: "Sharp eyes", emoji: "👁️" },
  { upTo: 6, title: "Just in time", emoji: "😅" },
  { upTo: 7, title: "Needed a clue", emoji: "💡" },
];
export const SHARE_LOSS_RATING = { title: "Needed glasses", emoji: "🤓" };
export const SHARE_CLUE_LOSS_RATING = { title: "Even the clue didn't help", emoji: "🙈" };
