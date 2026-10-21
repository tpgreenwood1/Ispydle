import { describe, expect, it } from "vitest";
import { evaluateGuesses } from "../../shared/evaluate";

const ANSWER = "sandal";
const CATEGORY = "Clothing";
const CLUE = "Open shoe with straps for summer";
const evaluate = (guesses: string[], reveal = false, clue: string | null = CLUE) =>
  evaluateGuesses(ANSWER, { category: CATEGORY, clue }, guesses, {
    category: reveal,
    clue: reveal,
  });

describe("evaluateGuesses: worked example (answer sandal)", () => {
  const table: [guess: string, matched: number, knownPrefix: string][] = [
    ["spoon", 1, "s"],
    ["sofa", 1, "s"],
    ["salad", 2, "sa"],
    ["sandy", 4, "sand"],
    ["sandal", 6, "sandal"],
  ];

  it.each(table.map((row, i) => [i, ...row] as const))(
    "guess %i (%s) matches %i, known prefix %s",
    (i, guess, matched, knownPrefix) => {
      const guesses = table.slice(0, i + 1).map(([g]) => g);
      const state = evaluate(guesses);
      expect(state.rows[i]).toEqual({ word: guess, matched });
      expect(ANSWER.slice(0, state.knownPrefixLen)).toBe(knownPrefix);
    },
  );

  it("solves on sandal", () => {
    const state = evaluate(table.map(([g]) => g));
    expect(state.status).toBe("won");
    expect(state.answer).toBe("sandal");
  });

  it("never shrinks the known prefix (salad after sandy)", () => {
    const state = evaluate(["sandy", "salad"]);
    expect(state.rows[1]?.matched).toBe(2);
    expect(state.knownPrefixLen).toBe(4);
  });
});

describe("evaluateGuesses: reveals", () => {
  it("starts with no known prefix", () => {
    expect(evaluate([]).knownPrefixLen).toBe(0);
  });

  it("hides the length before guess 2 and shows it from guess 2", () => {
    expect(evaluate(["spoon"]).wordLength).toBeNull();
    expect(evaluate(["spoon", "sofa"]).wordLength).toBe(6);
  });

  it("shows the length when the game ends early", () => {
    expect(evaluate(["sandal"]).wordLength).toBe(6);
  });

  it("unlocks the category after guess 3, only when revealed", () => {
    const two = ["spoon", "sofa"];
    expect(evaluate(two, true)).toMatchObject({ categoryAvailable: false, category: null });

    const three = [...two, "salad"];
    expect(evaluate(three)).toMatchObject({ categoryAvailable: true, category: null });
    expect(evaluate(three, true)).toMatchObject({ categoryAvailable: true, category: CATEGORY });
  });

  it("always includes the category once the game has ended", () => {
    expect(evaluate(["sandal"]).category).toBe(CATEGORY);
  });

  const SIX_MISSES = ["spoon", "sofa", "salad", "sandy", "sand", "sane"];

  it("never offers the clue before the last regular guess misses", () => {
    const five = SIX_MISSES.slice(0, 5);
    expect(evaluate(five, true)).toMatchObject({ clueAvailable: false, clue: null });
  });

  it("offers the last chance after 6 misses, without the clue or answer", () => {
    expect(evaluate(SIX_MISSES)).toMatchObject({
      status: "playing",
      clueAvailable: true,
      clue: null,
      answer: null,
    });
  });

  it("shows the clue when the last chance is taken, independently of the category", () => {
    const state = evaluateGuesses(ANSWER, { category: CATEGORY, clue: CLUE }, SIX_MISSES, {
      clue: true,
    });
    expect(state).toMatchObject({ status: "playing", category: null, clue: CLUE, answer: null });
  });

  it("wins on the last-chance guess", () => {
    const state = evaluate([...SIX_MISSES, "sandal"], true);
    expect(state).toMatchObject({ status: "won", guessesUsed: 7, answer: "sandal" });
  });

  it("loses when the last-chance guess misses", () => {
    const state = evaluate([...SIX_MISSES, "sauce"], true);
    expect(state).toMatchObject({ status: "lost", guessesUsed: 7, answer: "sandal" });
  });

  it("loses after 6 misses when the player gives up", () => {
    const state = evaluateGuesses(ANSWER, { category: CATEGORY, clue: CLUE }, SIX_MISSES, {
      giveUp: true,
    });
    expect(state).toMatchObject({ status: "lost", guessesUsed: 6, answer: "sandal", clue: CLUE });
  });

  it("loses after 6 misses when the puzzle has no clue", () => {
    expect(evaluate(SIX_MISSES, true, null)).toMatchObject({
      status: "lost",
      clueAvailable: false,
      clue: null,
    });
  });

  it("always includes the clue once the game has ended", () => {
    expect(evaluate(["sandal"]).clue).toBe(CLUE);
  });

  it("never includes the answer while playing", () => {
    const state = evaluate(["spoon", "sofa", "salad", "sandy", "sand"], true);
    expect(state.status).toBe("playing");
    expect(state.answer).toBeNull();
  });
});
