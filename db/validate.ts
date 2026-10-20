import { MAX_GUESS_LEN, MAX_WORD_LEN, MIN_GUESS_LEN, MIN_WORD_LEN } from "../shared/config.js";

export interface WordEntry {
  word: string;
  category: string;
  tier: number;
}

/** Parses the filter list (exact words, # comments) into the set of blocked words. */
export function parseFilter(text: string): Set<string> {
  const blocked = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const word = line.trim();
    if (word && !word.startsWith("#")) blocked.add(word);
  }
  return blocked;
}

/** Valid guesses: lowercase a-z within guess length bounds, minus blocked words. */
export function parseDictionary(text: string, blocked: Set<string>): string[] {
  const words = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const word = line.trim();
    if (
      /^[a-z]+$/.test(word) &&
      word.length >= MIN_GUESS_LEN &&
      word.length <= MAX_GUESS_LEN &&
      !blocked.has(word)
    ) {
      words.add(word);
    }
  }
  return [...words];
}

/** Validates words.json entries. Returns every problem found; empty means valid. */
export function validateWords(entries: unknown, dictionary: Set<string>): string[] {
  if (!Array.isArray(entries)) return ["words.json must be an array"];
  const errors: string[] = [];
  const seen = new Set<string>();
  const wordPattern = new RegExp(`^[a-z]{${MIN_WORD_LEN},${MAX_WORD_LEN}}$`);

  entries.forEach((entry: unknown, i) => {
    const e = (entry ?? {}) as Partial<Record<keyof WordEntry, unknown>>;
    const label = `#${i} ${JSON.stringify(e.word)}`;
    if (typeof e.word !== "string" || !wordPattern.test(e.word)) {
      errors.push(`${label}: word must be lowercase a-z, ${MIN_WORD_LEN}-${MAX_WORD_LEN} letters`);
    } else {
      if (seen.has(e.word)) errors.push(`${label}: duplicate word`);
      if (!dictionary.has(e.word)) errors.push(`${label}: not in dictionary`);
      seen.add(e.word);
    }
    if (typeof e.category !== "string" || !e.category.trim()) {
      errors.push(`${label}: missing category`);
    }
    if (typeof e.tier !== "number" || ![1, 2, 3].includes(e.tier)) {
      errors.push(`${label}: tier must be 1, 2 or 3`);
    }
  });
  return errors;
}

/** Picks `count` unused puzzle numbers in random order from [min, max]. */
export function assignPuzzleNos(
  count: number,
  used: Set<number>,
  min = 1000,
  max = 9999,
  random = Math.random,
): number[] {
  const pool: number[] = [];
  for (let n = min; n <= max; n++) if (!used.has(n)) pool.push(n);
  if (pool.length < count) throw new Error(`Only ${pool.length} puzzle numbers left`);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j] as number, pool[i] as number];
  }
  return pool.slice(0, count);
}
