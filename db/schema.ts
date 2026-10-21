import {
  boolean,
  integer,
  pgTable,
  serial,
  smallint,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const puzzles = pgTable("puzzles", {
  id: serial("id").primaryKey(),
  // Public id shown as #4821, drawn from a shuffled range so numbers don't reveal order or difficulty.
  puzzleNo: integer("puzzle_no").unique().notNull(),
  // Unique so the seed can upsert by word.
  word: varchar("word", { length: 7 }).unique().notNull(),
  category: text("category").notNull(),
  // Nullable so the column can be added to a populated table; the seed requires one for every word.
  clue: text("clue"),
  tier: smallint("tier").notNull().default(1),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const dictionary = pgTable("dictionary", {
  word: varchar("word", { length: 12 }).primaryKey(),
});
