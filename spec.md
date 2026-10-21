# I spydle: application spec

A Wordle-style web game based on the family game "I spy". The player is told the first letter of a hidden word and has up to 6 guesses. Each guess that shares leading letters with the answer reveals those letters as a growing prefix. The word's length is hidden at first.

This spec is the source of truth. Visual reference: the Light and Dark mockups (390×844 phone screens). The design tokens below are copied from them and take precedence over any screenshot.

---

## 1. Game rules

### Constants (single config file, easy to change)

| Name                  | Value | Meaning                                                          |
| --------------------- | ----- | ---------------------------------------------------------------- |
| `MAX_GUESSES`         | 6     | Guesses per game                                                 |
| `MAX_WORD_LEN`        | 6     | Longest answer served (env var); longer seeded words are skipped |
| `MIN_WORD_LEN`        | 3     | Shortest answer                                                  |
| `LENGTH_REVEAL_AFTER` | 2     | Word length is shown once this many guesses are used (env var)   |
| `CATEGORY_HINT_AFTER` | 3     | Category hint unlocks once this many guesses are used (env var)  |
| `CLUE_HINT_AFTER`     | 4     | Clue unlocks once this many guesses are used (env var)           |
| `MIN_GUESS_LEN`       | 2     | Shortest accepted guess                                          |
| `MAX_GUESS_LEN`       | 12    | Longest accepted guess                                           |
| `ENABLED_TIERS`       | `[1]` | Word difficulty tiers served (env var, comma separated)          |

### Flow

1. A puzzle starts with the first letter shown: "I spy with my little eye, something beginning with" followed by the prefix tiles.
2. The player types a guess and submits.
3. **Valid guess** means all of:
   - letters a to z only, 2 to 12 long
   - starts with the puzzle's first letter (error: "Must start with S")
   - exists in the dictionary (error: "Not in word list")
   - not already guessed in this game (error: "Already guessed")
     Invalid guesses shake the input row, show a short message, and **do not cost a guess**.
4. A valid guess is evaluated:
   - `matched` = length of the longest common prefix of the guess and the answer (at least 1, since guesses must start with the first letter).
   - Letters at positions `< matched` are **confirmed** (green). All other letters in that row are **no help** (grey).
   - The **known prefix** is the largest `matched` seen so far in the game. It is shown in the top tile row.
   - Example: answer `sandwich`; guess `sandy` gives `matched = 4`, so the known prefix becomes `SAND`.
5. **Win:** the guess equals the answer. **Loss:** `MAX_GUESSES` used without a win.
6. **Length reveal:** once `LENGTH_REVEAL_AFTER` guesses are used (or the game ends), the top row shows dashed empty tiles up to the word's full length, with a small animation, plus a "N letters" caption. Before that, the top row is the known prefix followed by one dashed tile and no length caption.
7. **Category hint:** a strip below the counter reads "Category hint unlocks after guess 3". After `CATEGORY_HINT_AFTER` guesses it becomes a tappable "Show category" button that reveals the category (for example "Clothing") inline.
8. **Clue:** once the category unlocks, a second strip appears below it reading "Clue unlocks after guess 4". After `CLUE_HINT_AFTER` guesses it becomes a "Show clue" button that reveals a one-line clue (for example "Open shoe with straps for summer"). The clue can be revealed without the category.
9. On win or loss, a result sheet opens (see section 5).

### Worked examples (must be unit tests)

Answer `sandal`, first letter `s`:

| Guess    | matched | Known prefix after | Row colours           |
| -------- | ------- | ------------------ | --------------------- |
| `spoon`  | 1       | S                  | S green, rest grey    |
| `sofa`   | 1       | S                  | S green, rest grey    |
| `salad`  | 2       | SA                 | S A green, L A D grey |
| `sandy`  | 4       | SAND               | S A N D green, Y grey |
| `sandal` | 6       | solved             | all green             |

A later guess with a shorter match never shrinks the known prefix (`salad` after `sandy` leaves it at SAND).

### Share result (spoiler-free)

One square per guess, then a link:

```
I spydle #4821 🔍 4/6
🟩⬜🟩🟨
https://<domain>/p/4821
```

- ⬜ = the guess revealed no new letters (the known prefix starts at 0, so guess 1 is always 🟩 or 🟨)
- 🟩 = the guess extended the known prefix (`matched` > the known prefix before that guess)
- 🟨 = solved
- Loss shows `X/6` and no 🟨.
- Never include the word, its length, letters, or the category.
- Use the Web Share API where available, else copy to the clipboard and show a "Copied" toast.

---

## 2. Tech stack

- **Frontend:** React 18 + TypeScript + Vite, React Router, plain CSS with CSS variables (no UI kit). Tailwind is acceptable if the tokens below map exactly.
- **Backend:** Vercel Functions (TypeScript) in `/api`, deployed on Vercel.
- **Database:** Neon Postgres via `@neondatabase/serverless` and Drizzle ORM (`drizzle-orm/neon-http`) with drizzle-kit migrations.
- **Tests:** Vitest for logic, Playwright for one end-to-end smoke test.
- **Tooling:** pnpm, ESLint, Prettier, strict TypeScript.
- **Env:** `DATABASE_URL` (Neon, pooled), `ENABLED_TIERS`.

### Architecture decision: the answer never reaches the client

The browser never receives the answer until the game ends. The server is **stateless**: each guess request sends the full ordered list of guesses for that puzzle, and the server re-evaluates everything from the stored answer. This avoids sessions and keeps replays, refreshes and device switches trivial. The game logic (`evaluateGuesses`) lives in a shared `/shared` package imported by both the API and the tests. The client only imports the types and constants, never the answer.

---

## 3. Data model (Drizzle)

```ts
puzzles: {
  id: serial primary key,
  puzzleNo: integer unique not null,   // public id shown as #4821; assigned from a shuffled range at seed time so numbers don't reveal order or difficulty
  word: varchar(7) not null,           // lowercase a-z
  category: text not null,
  clue: text                           // one-line hint; required by the seed, nullable only for migration
  tier: smallint not null default 1,   // 1 easy, 2 medium, 3 harder
  active: boolean not null default true,
  createdAt: timestamptz default now()
}

dictionary: {
  word: varchar(12) primary key        // valid guesses, lowercase a-z
}
```

### Seeding (`pnpm seed`)

- Reads `data/words.json`: `[{ "word": "sandal", "category": "Clothing", "clue": "Open shoe with straps for summer", "tier": 1 }]`. Extra fields (such as `neighbours`) are ignored.
- Reads `data/dictionary.txt`: one lowercase word per line. Use a permissive or public-domain source (for example ENABLE or a SCOWL export). **Filter out profanity, slurs and adult terms**: this is a family game. Keep the filter list in the repo.
- Validation (fail the seed loudly): every answer is lowercase a-z, 3 to 12 letters (answers over `MAX_WORD_LEN` are seeded but not served), unique, present in the dictionary, has a category, has a clue that does not contain the word, and has a tier of 1 to 3. Print a summary: counts by length, by first letter, by category and by tier.
- Idempotent: upsert by word, never reassign an existing `puzzleNo`.

---

## 4. API

All JSON. The answer is only ever returned in `answer` when `status` is `won` or `lost`.

### `GET /api/puzzles/random?exclude=12,87`

Picks a random active puzzle in `ENABLED_TIERS`, skipping the excluded puzzle numbers (the client sends the ones already played; if all are played, ignore the exclusion).

```json
{ "puzzleNo": 4821, "firstLetter": "s" }
```

`Cache-Control: no-store`.

### `GET /api/puzzles/:puzzleNo`

Same shape. `404` if unknown or inactive.

### `POST /api/puzzles/:puzzleNo/guess`

Body: `{ "guesses": ["spoon", "sofa", "salad"] }` (the full history, oldest first, including the new guess last).

The server validates every guess in order (rules in section 1; a duplicate within the list is invalid). It then evaluates.

Success (`200`):

```json
{
  "valid": true,
  "state": {
    "rows": [
      { "word": "spoon", "matched": 1 },
      { "word": "salad", "matched": 2 }
    ],
    "knownPrefixLen": 2,
    "status": "playing",
    "guessesUsed": 2,
    "wordLength": null,
    "categoryAvailable": false,
    "category": null,
    "clueAvailable": false,
    "clue": null,
    "answer": null
  }
}
```

- `wordLength` is a number once `guessesUsed >= LENGTH_REVEAL_AFTER` or the game has ended, else `null`.
- `categoryAvailable` becomes true at `CATEGORY_HINT_AFTER`; `category` is included once the player has tapped to reveal it. The client requests it by adding `"revealCategory": true` to the body (also always included when the game has ended).
- `clueAvailable` becomes true at `CLUE_HINT_AFTER` (and only if the puzzle has a clue); `clue` works the same way, requested with `"revealClue": true`.
- `answer` is only set when `status` is `won` or `lost`.

Invalid last guess (`200`, so the client treats it as a normal response): `{ "valid": false, "error": "NOT_IN_DICTIONARY" | "WRONG_FIRST_LETTER" | "ALREADY_GUESSED" | "BAD_FORMAT" }`. Bad request shapes return `400`. More than `MAX_GUESSES` guesses returns `400`.

### Abuse handling (v1)

Cap request body size, cap guesses per request, and add basic IP rate limiting (Vercel firewall rules or a small Neon-backed or in-memory limiter). Note in the README that a determined person can probe the API; this is accepted for a casual game.

---

## 5. Frontend

### Routes

- `/` resumes the most recent unfinished game if one exists, otherwise fetches a random puzzle and redirects to `/p/:no`.
- `/p/:puzzleNo` loads that puzzle (a shared link). If the player already finished it on this device, show the result sheet and a "Play another" action. Unknown puzzle shows a friendly message and "Play a random word".

### Screen layout (390 wide reference, top to bottom)

1. **Header** (64px): round accent logo badge with a magnifier icon, the title "I spydle", then two 44px icon buttons: How to play (?) and Stats (bars). Add a theme toggle inside the Stats sheet or a third header icon: System / Light / Dark.
2. **Prompt:** "I spy with my little eye, something beginning with", 17px bold.
3. **Known prefix row:** a 7-column grid, tiles 44px (circles), 5px gap. Confirmed letters green; remaining slots (after the length reveal) dashed empty circles; unused columns invisible.
4. **Length caption:** magnifier icon + "6 letters" (only after the reveal).
5. **Divider**, then the **guess history**: the same 7-column grid so letter columns line up with the prefix row. Each row shows the guess letters; confirmed tiles green, others grey. After the length reveal, show faint dashed placeholder rows for the remaining guesses at the exact word length. Before the reveal, show no placeholder rows; reserve the vertical space so the layout doesn't jump.
6. **Counter row:** six pips (filled = used) plus "N guesses left" on the left; "Word #4821" on the right.
7. **Category hint strip:** dashed bordered pill with a lock icon, "Category hint unlocks after guess 3". Turns into a "Show category" button, then shows the category text. Once the category unlocks, a matching clue strip appears below it ("Clue unlocks after guess 4", then "Show clue", then the clue text).
8. **Input row** (bottom, above the keyboard): a text input (flex 1) and the "Guess" button (104px wide).

Layout rules: the app column is max 420px wide and centred on larger screens, full height with `100dvh`, and respects `env(safe-area-inset-*)`. Use the **native** keyboard: `autoCapitalize="off"`, `autoCorrect="off"`, `autoComplete="off"`, `spellCheck={false}`, `enterKeyHint="go"`, `maxLength={12}`. Enter submits. When the keyboard opens, the history area scrolls so the input and the prefix row stay visible. For widths below 360px, tiles scale down via the grid (`aspect-ratio: 1`) rather than overflowing.

### Design tokens

Fonts (Google Fonts): **Fredoka** 500/600 for the title, tiles and Guess button; **Nunito** 600/700 for everything else. Tile letters 22px, uppercase.

| Token                       | Light             | Dark              |
| --------------------------- | ----------------- | ----------------- |
| ground                      | `#EEF3FA`         | `#0F1B2D`         |
| ink (text)                  | `#14213D`         | `#E8EEF8`         |
| muted text                  | `#566179`         | `#A3B1C9`         |
| divider                     | `#D3DCEA`         | `#263650`         |
| confirmed (green)           | `#17794D`         | `#34C77B`         |
| text on confirmed           | `#FFFFFF`         | `#08170F`         |
| no-help tile                | `#DCE2EC`         | `#26354D`         |
| unknown tile dashed         | `#8E9AB0`         | `#5E7191`         |
| placeholder row dashed      | `#CBD4E2`         | `#33445F`         |
| hint strip dashed           | `#B7C2D4`         | `#3A4C69`         |
| accent (logo, Guess button) | `#F5B63A`         | `#F5B63A`         |
| text on accent              | `#14213D`         | `#0F1B2D`         |
| input background            | `#FFFFFF`         | `#172640`         |
| input border                | ink               | ink               |
| button shadow               | `0 3px 0 #14213D` | `0 3px 0 #05090F` |

Shapes: tiles are circles (44px, 2px border); input and button radius 14px; hint strip radius 12px; 12px circular pips (filled = ink, empty = 2px border in the "unknown tile dashed" colour). All body text meets WCAG AA contrast; keep all touch targets at least 44px.

Theme: follow `prefers-color-scheme` by default; the user can override (System / Light / Dark), persisted in localStorage. Implement with CSS variables on `:root` plus `[data-theme]`.

### Sheets and states

- **How to play** (shown on first visit, reopenable): three short steps with a tiny worked example (guess `sandy` for a hidden `sandal` makes `SAND` appear). Keep it to two or three lines of text.
- **Result sheet** (win or loss): win shows "Spotted it! 4/6"; loss shows "It was SANDAL". Both show the category and clue, a primary **Share** button, and **Play another word**. Do not auto-dismiss.
- **Stats sheet:** games played, win percentage, and a bar distribution of wins by guess count (1 to 6). No streaks in v1 (unlimited play).
- **Toasts:** short, top-centre, for validation errors and "Copied".

### Motion

- Invalid guess: horizontal shake on the input row.
- New confirmed letters: a short pop, staggered left to right.
- Length reveal: placeholder tiles appear one by one.
- Respect `prefers-reduced-motion` (swap animation for instant state changes).

### Accessibility

- Real `<button>`, `<input>` + visible or visually hidden `<label>`. Icon-only buttons get `aria-label`.
- An `aria-live="polite"` region announces results, for example "salad: S A confirmed, known prefix SA, 4 guesses left".
- Tile grids are decorative to screen readers; the live region carries the information. Colour is never the only signal: confirmed tiles also carry a visually hidden "confirmed".

### Persistence (localStorage, versioned keys)

- `ispydle:v1:games`: `{ [puzzleNo]: { guesses: string[], status, startedAt } }`, keep the latest 200.
- `ispydle:v1:stats`, `ispydle:v1:theme`, `ispydle:v1:seen-help`.
- On load, rebuild the game state by POSTing the stored guesses to the API (so the client never stores the answer, except in a finished game's result where it may cache the revealed answer).
- A refresh must never lose progress.

---

## 6. Project structure

```
/api          vercel functions (puzzles/random, puzzles/[puzzleNo], puzzles/[puzzleNo]/guess)
/shared       config constants, evaluateGuesses, validateGuess, share-string builder, types
/src          React app (components, hooks, routes, styles/tokens.css)
/db           drizzle schema, migrations, seed script, validators
/data         words.json, dictionary.txt, profanity-filter.txt
/tests        unit tests + playwright smoke
vercel.json   SPA fallback rewrite to index.html (excluding /api)
README.md     setup, env vars, seeding, deploy
```

---

## 7. Build order

1. Scaffold the project, strict TS, lint and format, `/shared` with config and types.
2. `evaluateGuesses` and `validateGuess` in `/shared` with the unit tests from section 1.
3. Drizzle schema, migration, the seed script with validation, and a tiny starter `words.json` (20 words) for local work.
4. API routes with tests (valid and invalid guesses, the answer never leaked before the end, length reveal timing).
5. Frontend: tokens and theming, then the game screen with static data, then wiring to the API, then persistence.
6. Sheets (How to play, Result, Stats), share, toasts, motion, accessibility pass.
7. Playwright smoke test: load, make an invalid guess, make valid guesses, reach the length reveal, win, and check the share text.
8. Deploy to Vercel with a Neon database, seed, README.

## 8. Acceptance criteria

- All worked examples pass as unit tests; the evaluation logic is only implemented once, in `/shared`.
- A network inspection of any request before game end never shows the answer.
- Invalid guesses never consume a guess; refreshing mid-game restores the board exactly.
- The length appears after guess 2 and not before; the category unlocks after guess 3.
- The share text contains no letters of the answer and no length.
- Light and dark modes match the tokens; Lighthouse accessibility score is at least 95 on the game screen.
- Works on iOS Safari and Android Chrome with the native keyboard, with no layout jump when the keyboard opens.

## 9. Out of scope for v1 (but don't block them)

Accounts, a daily word, leaderboards, a "hard mode" requiring guesses to start with the known prefix, other languages, multiplayer, a word-submission flow for players. Keep `tier` and `active` columns so that word difficulty and rollout can be changed without a deploy.
