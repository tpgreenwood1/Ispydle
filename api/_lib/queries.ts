import { and, eq, inArray, lte, notInArray, sql } from "drizzle-orm";
import { MAX_WORD_LEN } from "../../shared/config.js";
import { createDb, type Db } from "../../db/client.js";
import { dictionary, puzzles } from "../../db/schema.js";

let db: Db | undefined;
const getDb = () => (db ??= createDb());

export interface Puzzle {
  puzzleNo: number;
  word: string;
  category: string;
}

const columns = { puzzleNo: puzzles.puzzleNo, word: puzzles.word, category: puzzles.category };

// Puzzles longer than MAX_WORD_LEN stay in the database but are not served.
const withinMaxLen = lte(sql`length(${puzzles.word})`, MAX_WORD_LEN);

export async function getPuzzle(puzzleNo: number): Promise<Puzzle | null> {
  const [row] = await getDb()
    .select(columns)
    .from(puzzles)
    .where(and(eq(puzzles.puzzleNo, puzzleNo), eq(puzzles.active, true), withinMaxLen));
  return row ?? null;
}

/** A random active puzzle in `tiers`, skipping `exclude` unless that leaves none. */
export async function randomPuzzle(tiers: number[], exclude: number[]): Promise<Puzzle | null> {
  const pick = async (skip: number[]) => {
    const [row] = await getDb()
      .select(columns)
      .from(puzzles)
      .where(
        and(
          eq(puzzles.active, true),
          withinMaxLen,
          inArray(puzzles.tier, tiers),
          skip.length ? notInArray(puzzles.puzzleNo, skip) : undefined,
        ),
      )
      .orderBy(sql`random()`)
      .limit(1);
    return row ?? null;
  };
  return (await pick(exclude)) ?? (exclude.length ? pick([]) : null);
}

/** The subset of `words` present in the dictionary. */
export async function dictionaryHas(words: string[]): Promise<Set<string>> {
  if (!words.length) return new Set();
  const rows = await getDb()
    .select({ word: dictionary.word })
    .from(dictionary)
    .where(inArray(dictionary.word, words));
  return new Set(rows.map((r) => r.word));
}
