CREATE TABLE "dictionary" (
	"word" varchar(12) PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "puzzles" (
	"id" serial PRIMARY KEY NOT NULL,
	"puzzle_no" integer NOT NULL,
	"word" varchar(7) NOT NULL,
	"category" text NOT NULL,
	"tier" smallint DEFAULT 1 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "puzzles_puzzle_no_unique" UNIQUE("puzzle_no"),
	CONSTRAINT "puzzles_word_unique" UNIQUE("word")
);
