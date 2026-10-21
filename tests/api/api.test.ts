import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Puzzle } from "../../api/_lib/queries";

const PUZZLES: (Puzzle & { tier: number })[] = [
  { puzzleNo: 4821, word: "sandal", category: "Clothing", tier: 1 },
  { puzzleNo: 1234, word: "acorn", category: "Nature", tier: 1 },
  { puzzleNo: 5555, word: "yacht", category: "Vehicles", tier: 2 },
];
const DICTIONARY = new Set(["spoon", "sofa", "salad", "sandy", "sand", "sane", "sandal", "acorn"]);

vi.mock("../../api/_lib/queries", () => ({
  getPuzzle: vi.fn(async (no: number) => PUZZLES.find((p) => p.puzzleNo === no) ?? null),
  randomPuzzle: vi.fn(async (tiers: number[], exclude: number[]) => {
    const pool = PUZZLES.filter((p) => tiers.includes(p.tier));
    return pool.find((p) => !exclude.includes(p.puzzleNo)) ?? pool[0] ?? null;
  }),
  dictionaryHas: vi.fn(async (words: string[]) => new Set(words.filter((w) => DICTIONARY.has(w)))),
}));

const { GET: getRandom } = await import("../../api/puzzles/random");
const { GET: getPuzzle } = await import("../../api/puzzles/[puzzleNo]");
const { POST: postGuess } = await import("../../api/puzzles/[puzzleNo]/guess");

const BASE = "http://localhost/api/puzzles";

function guess(body: unknown, puzzleNo = 4821) {
  return postGuess(
    new Request(`${BASE}/${puzzleNo}/guess`, {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  process.env.ENABLED_TIERS = "1";
});

describe("GET /api/puzzles/random", () => {
  it("returns the puzzle number and first letter only, uncached", async () => {
    const res = await getRandom(new Request(`${BASE}/random`));
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(await res.json()).toEqual({ puzzleNo: 4821, firstLetter: "s" });
  });

  it("skips excluded puzzles", async () => {
    const res = await getRandom(new Request(`${BASE}/random?exclude=4821,bad`));
    expect(await res.json()).toEqual({ puzzleNo: 1234, firstLetter: "a" });
  });

  it("ignores the exclusion once every puzzle has been played", async () => {
    const res = await getRandom(new Request(`${BASE}/random?exclude=4821,1234`));
    expect(res.status).toBe(200);
  });

  it("only serves enabled tiers", async () => {
    process.env.ENABLED_TIERS = "2";
    const res = await getRandom(new Request(`${BASE}/random`));
    expect(await res.json()).toEqual({ puzzleNo: 5555, firstLetter: "y" });
  });
});

describe("GET /api/puzzles/:puzzleNo", () => {
  it("returns the puzzle", async () => {
    const res = await getPuzzle(new Request(`${BASE}/4821`));
    expect(await res.json()).toEqual({ puzzleNo: 4821, firstLetter: "s" });
  });

  it("404s for an unknown puzzle", async () => {
    expect((await getPuzzle(new Request(`${BASE}/9`))).status).toBe(404);
  });
});

describe("POST /api/puzzles/:puzzleNo/guess", () => {
  it("evaluates a valid history without leaking the answer", async () => {
    const res = await guess({ guesses: ["spoon"] });
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({
      valid: true,
      state: {
        rows: [{ word: "spoon", matched: 1 }],
        knownPrefixLen: 1,
        status: "playing",
        guessesUsed: 1,
        wordLength: null,
        categoryAvailable: false,
        category: null,
        answer: null,
      },
    });
    expect(text).not.toContain("sandal");
    expect(text).not.toContain("Clothing");
  });

  it("reveals the length from guess 2", async () => {
    const res = await guess({ guesses: ["spoon", "sofa"] });
    const { state } = await res.json();
    expect(state.wordLength).toBe(6);
    expect(state.answer).toBeNull();
  });

  it("returns the category only when asked after guess 3", async () => {
    const three = ["spoon", "sofa", "salad"];
    const hidden = await (await guess({ guesses: three })).json();
    expect(hidden.state).toMatchObject({ categoryAvailable: true, category: null });
    const early = await (await guess({ guesses: three.slice(0, 2), revealCategory: true })).json();
    expect(early.state.category).toBeNull();
    const shown = await (await guess({ guesses: three, revealCategory: true })).json();
    expect(shown.state.category).toBe("Clothing");
    expect(shown.state.answer).toBeNull();
  });

  it("returns the answer and category on a win or loss", async () => {
    const won = await (await guess({ guesses: ["salad", "sandal"] })).json();
    expect(won.state).toMatchObject({ status: "won", answer: "sandal", category: "Clothing" });
    const lost = await (
      await guess({ guesses: ["spoon", "sofa", "salad", "sandy", "sand", "sane"] })
    ).json();
    expect(lost.state).toMatchObject({ status: "lost", answer: "sandal", wordLength: 6 });
  });

  it.each([
    ["sxyz", "NOT_IN_DICTIONARY"],
    ["acorn", "WRONG_FIRST_LETTER"],
    ["spoon", "ALREADY_GUESSED"],
    ["so-fa", "BAD_FORMAT"],
    ["s", "BAD_FORMAT"],
    ["SPOON", "ALREADY_GUESSED"],
  ])("rejects a last guess of %s as %s with 200", async (last, code) => {
    const res = await guess({ guesses: ["spoon", last] });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ valid: false, error: code });
  });

  it.each([
    ["an invalid earlier guess", { guesses: ["sxyz", "spoon"] }],
    ["a duplicate earlier guess", { guesses: ["spoon", "spoon", "sofa"] }],
    ["more than 6 guesses", { guesses: ["a", "b", "c", "d", "e", "f", "g"] }],
    ["a guess after the win", { guesses: ["sandal", "spoon"] }],
    ["non-string guesses", { guesses: [1] }],
    ["a missing guesses field", {}],
    ["a non-boolean revealCategory", { guesses: [], revealCategory: "yes" }],
    ["malformed JSON", "{"],
  ])("returns 400 for %s", async (_, body) => {
    expect((await guess(body)).status).toBe(400);
  });

  it("accepts guesses in any case", async () => {
    const res = await guess({ guesses: ["Spoon", " SALAD "] });
    const { state } = await res.json();
    expect(state.rows).toEqual([
      { word: "spoon", matched: 1 },
      { word: "salad", matched: 2 },
    ]);
  });

  it("returns 503 JSON when the database is unreachable", async () => {
    const { getPuzzle: mocked } = await import("../../api/_lib/queries");
    vi.mocked(mocked).mockRejectedValueOnce(new TypeError("fetch failed"));
    const res = await guess({ guesses: ["spoon"] });
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "Service unavailable" });
  });

  it("returns 413 for an oversized body", async () => {
    expect((await guess({ guesses: ["x".repeat(3000)] })).status).toBe(413);
  });

  it("404s for an unknown puzzle", async () => {
    expect((await guess({ guesses: ["spoon"] }, 9)).status).toBe(404);
  });
});
