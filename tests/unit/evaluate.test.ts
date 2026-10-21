import { describe, expect, it } from "vitest";
import { evaluateGuesses } from "../../shared/evaluate";

const ANSWER = "sandal";
const CATEGORY = "Clothing";
const evaluate = (guesses: string[], reveal = false) =>
  evaluateGuesses(ANSWER, CATEGORY, guesses, reveal);

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

  it("never includes the answer while playing", () => {
    const state = evaluate(["spoon", "sofa", "salad", "sandy", "sand"], true);
    expect(state.status).toBe("playing");
    expect(state.answer).toBeNull();
  });

  it("loses after 6 guesses without the answer", () => {
    const state = evaluate(["spoon", "sofa", "salad", "sandy", "sand", "sane"]);
    expect(state.status).toBe("lost");
    expect(state.answer).toBe("sandal");
    expect(state.guessesUsed).toBe(6);
  });
});
