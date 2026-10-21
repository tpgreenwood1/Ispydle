# I spydle

A Wordle-style take on "I spy". You get the first letter of a hidden word and six guesses; each guess that shares leading letters with the answer grows the known prefix. See [spec.md](spec.md) for the full rules and design.

**Stack:** React 18 + TypeScript + Vite, Vercel Functions (`/api`), Neon Postgres via Drizzle, Vitest and Playwright.

## How it fits together

- The browser never receives the answer until the game ends. The API is stateless: every guess request sends the full guess history, and the server re-evaluates it against the stored answer.
- Game rules live once, in `shared/` (`evaluateGuesses`, `validateGuess`, the share text). The API imports them; the client only imports types, constants and the share builder.
- Progress is kept in `localStorage` (`ispydle:v1:*`) as the list of guesses, and rebuilt from the API on load, so a refresh never loses a game.

```
api/      Vercel Functions: puzzles/random, puzzles/[puzzleNo], puzzles/[puzzleNo]/guess
shared/   config constants, game logic, share text, types
src/      React app
db/       Drizzle schema, migrations, seed script and validators
data/     words.json (answers), dictionary.txt (ENABLE word list), profanity-filter.txt
tests/    unit, api and e2e tests
```

## Setup

Requires Node 20+ and pnpm (`corepack enable`, or run commands as `corepack pnpm …`).

```sh
pnpm install
cp .env.example .env   # then fill in DATABASE_URL
```

| Variable        | Description                                                                |
| --------------- | -------------------------------------------------------------------------- |
| `DATABASE_URL`  | Neon **pooled** connection string                                          |
| `ENABLED_TIERS` | Comma-separated difficulty tiers to serve, e.g. `1` or `1,2` (default `1`) |

## Database

```sh
pnpm db:migrate   # apply migrations in db/migrations
pnpm seed         # load the dictionary and puzzles
```

The seed is idempotent. It:

- loads `data/dictionary.txt` (the public-domain ENABLE list) as valid guesses, minus the words in `data/profanity-filter.txt` (exact matches; list inflections explicitly);
- validates `data/words.json` and fails loudly on any problem (lowercase a–z, 3–7 letters, unique, in the dictionary, has a category, tier 1–3);
- upserts puzzles by word and never reassigns an existing `puzzleNo`. New words get numbers from a shuffled 1000–9999 range so numbers don't reveal order or difficulty;
- prints counts by length, first letter, category and tier.

To add words, edit `data/words.json` and run `pnpm seed` again. To retire a word or change what's served without a deploy, update `active` or `tier` in the `puzzles` table (and `ENABLED_TIERS`).

After a schema change in `db/schema.ts`, run `pnpm db:generate` and commit the new migration.

## Development

```sh
pnpm dev          # http://localhost:5173, with the API served from /api
```

In development a small Vite plugin (`vite-plugin-api.ts`) runs the same `/api` handlers that Vercel deploys, so no Vercel CLI is needed. It uses the database in `.env`.

## Tests

```sh
pnpm test         # unit + API tests (Vitest; the database is mocked)
pnpm e2e          # Playwright smoke test against the database in .env
pnpm lint && pnpm typecheck && pnpm format:check
```

The first e2e run needs a browser: `pnpm exec playwright install chromium`. The smoke test reads a puzzle and its answer straight from the database, plays it to a win, and checks the share text. It needs a seeded database.

## Deploy (Vercel)

1. Import the repo in Vercel. The framework preset is Vite; build command `pnpm build`, output `dist`.
2. Set `DATABASE_URL` and `ENABLED_TIERS` for Production (and Preview, ideally pointing at a Neon branch).
3. Run `pnpm db:migrate` and `pnpm seed` against the production database.

`vercel.json` rewrites every non-`/api` path to `index.html` so routes like `/p/4821` work.

## Abuse handling

Request bodies are capped at 2 KB, a request may carry at most 6 guesses, and each IP is limited to 120 requests a minute. The limiter is in memory, so each serverless instance counts separately: it slows casual abuse rather than stopping it.

Because the API evaluates any guess history, a determined person can probe it (for example, by trying words until one matches more letters). That's accepted for a casual game; the answer itself is never sent before a game ends.
