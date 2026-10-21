import "dotenv/config";
import { readFileSync } from "node:fs";
import { inArray, sql } from "drizzle-orm";
import { createDb } from "./client.js";
import { dictionary, puzzles } from "./schema.js";
import {
  assignPuzzleNos,
  parseDictionary,
  parseFilter,
  validateWords,
  type WordEntry,
} from "./validate.js";

const CHUNK = 5000;

function countBy<T>(items: T[], key: (item: T) => string | number) {
  const counts: Record<string, number> = {};
  for (const item of items) counts[key(item)] = (counts[key(item)] ?? 0) + 1;
  return counts;
}

async function main() {
  const blocked = parseFilter(readFileSync("data/profanity-filter.txt", "utf8"));
  const words = parseDictionary(readFileSync("data/dictionary.txt", "utf8"), blocked);
  const entries: unknown = JSON.parse(readFileSync("data/words.json", "utf8"));

  const errors = validateWords(entries, new Set(words));
  if (errors.length) {
    console.error(`words.json is invalid (${errors.length} problems):`);
    for (const e of errors) console.error(`  ${e}`);
    process.exit(1);
  }
  const answers = (entries as WordEntry[]).map(({ word, category, clue, tier }) => ({
    word,
    category,
    clue,
    tier,
  }));

  const db = createDb();

  console.log(`Dictionary: upserting ${words.length} words...`);
  for (let i = 0; i < words.length; i += CHUNK) {
    const chunk = words.slice(i, i + CHUNK).map((word) => ({ word }));
    await db.insert(dictionary).values(chunk).onConflictDoNothing();
  }
  await db.delete(dictionary).where(inArray(dictionary.word, [...blocked]));

  const existing = await db
    .select({ word: puzzles.word, puzzleNo: puzzles.puzzleNo })
    .from(puzzles);
  const existingNos = new Map(existing.map((p) => [p.word, p.puzzleNo]));
  const newWords = answers.filter((a) => !existingNos.has(a.word));
  const newNos = assignPuzzleNos(newWords.length, new Set(existingNos.values()));
  newWords.forEach((a, i) => existingNos.set(a.word, newNos[i] as number));

  console.log(`Puzzles: upserting ${answers.length} (${newWords.length} new)...`);
  for (let i = 0; i < answers.length; i += CHUNK) {
    const chunk = answers
      .slice(i, i + CHUNK)
      .map((a) => ({ ...a, puzzleNo: existingNos.get(a.word) as number }));
    await db
      .insert(puzzles)
      .values(chunk)
      .onConflictDoUpdate({
        target: puzzles.word,
        // Never reassign puzzleNo.
        set: {
          category: sql`excluded.category`,
          clue: sql`excluded.clue`,
          tier: sql`excluded.tier`,
        },
      });
  }

  console.log("\nSummary");
  console.log(
    "By length:",
    countBy(answers, (a) => a.word.length),
  );
  console.log(
    "By first letter:",
    countBy(answers, (a) => a.word[0] ?? ""),
  );
  console.log(
    "By category:",
    countBy(answers, (a) => a.category),
  );
  console.log(
    "By tier:",
    countBy(answers, (a) => a.tier),
  );
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
