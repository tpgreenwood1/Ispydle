import { describe, expect, it } from "vitest";
import { assignPuzzleNos, parseDictionary, parseFilter, validateWords } from "../../db/validate";

describe("parseFilter / parseDictionary", () => {
  const blocked = parseFilter("# comment\nheck\r\nhecking\n\n");

  it("blocks exact words only and skips comments", () => {
    expect([...blocked]).toEqual(["heck", "hecking"]);
  });

  it("keeps a-z words of guess length, minus blocked ones", () => {
    const text = "a\nso\nsandal\nhecking\nSandal\nit's\nabcdefghijklm\r\nsofa\r\nsofa";
    expect(parseDictionary(text, blocked)).toEqual(["so", "sandal", "sofa"]);
  });
});

describe("validateWords", () => {
  const dict = new Set(["sandal", "acorn"]);
  const valid = { word: "sandal", category: "Clothing", clue: "Open shoe for summer", tier: 1 };

  it("accepts valid entries and ignores extra fields", () => {
    expect(validateWords([{ ...valid, neighbours: ["sand"] }], dict)).toEqual([]);
  });

  it("reports every problem", () => {
    const errors = validateWords(
      [
        valid,
        valid,
        { word: "Acorn", category: "Nature", clue: "Nut", tier: 1 },
        { word: "zebra", category: "", tier: 4 },
        { word: "ab", category: "X", clue: "Y", tier: 1 },
        { ...valid, word: "acorn", clue: "An ACORN falls from an oak" },
      ],
      dict,
    );
    expect(errors).toEqual([
      '#1 "sandal": duplicate word',
      '#2 "Acorn": word must be lowercase a-z, 3-12 letters',
      '#3 "zebra": not in dictionary',
      '#3 "zebra": missing category',
      '#3 "zebra": missing clue',
      '#3 "zebra": tier must be 1, 2 or 3',
      '#4 "ab": word must be lowercase a-z, 3-12 letters',
      '#5 "acorn": clue gives away the word',
    ]);
  });

  it("rejects a non-array", () => {
    expect(validateWords({}, dict)).toEqual(["words.json must be an array"]);
  });
});

describe("assignPuzzleNos", () => {
  it("returns distinct unused numbers within range", () => {
    const used = new Set([1, 2, 3]);
    const nos = assignPuzzleNos(5, used, 1, 10);
    expect(new Set(nos).size).toBe(5);
    for (const n of nos) {
      expect(used.has(n)).toBe(false);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(10);
    }
  });

  it("throws when the range is exhausted", () => {
    expect(() => assignPuzzleNos(2, new Set([1]), 1, 2)).toThrow();
  });
});
