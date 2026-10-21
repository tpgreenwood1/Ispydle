import { describe, expect, it } from "vitest";
import words from "../../data/words.json";
import { buildShareText, parseResultParam, shareImageAlt } from "../../shared/share";

const BASE = "https://ispydle.example";

function share(status: "won" | "lost", guessesUsed: number, withResultParam = false, letter = "s") {
  return buildShareText({
    puzzleNo: 4821,
    firstLetter: letter,
    status,
    guessesUsed,
    maxGuesses: 6,
    baseUrl: BASE,
    withResultParam,
  });
}

describe("buildShareText", () => {
  it.each([
    [1, "🦅 Eagle eyes: spied it in 1/6. Can you beat me?", "🟢⚪⚪⚪⚪⚪"],
    [3, "👁️ Sharp eyes: spied it in 3/6. Can you beat me?", "⚫⚫🟢⚪⚪⚪"],
    [5, "👁️ Sharp eyes: spied it in 5/6. Can you beat me?", "⚫⚫⚫⚫🟢⚪"],
    [6, "😅 Just in time: spied it in 6/6. Can you beat me?", "⚫⚫⚫⚫⚫🟢"],
  ])("builds a win in %i with the matching rating title and pips", (n, line, pips) => {
    expect(share("won", n)).toBe(
      ["I spy something beginning with S…", line, pips, `${BASE}/p/4821`].join("\n"),
    );
    expect(share("won", n, true).split("\n")[3]).toBe(`${BASE}/p/4821?r=w${n}`);
  });

  it("builds a loss", () => {
    expect(share("lost", 6)).toBe(
      [
        "I spy something beginning with S…",
        "🤓 Needed glasses: couldn't spot it in 6. Can you?",
        "⚫⚫⚫⚫⚫⚫",
        `${BASE}/p/4821`,
      ].join("\n"),
    );
    expect(share("lost", 6, true).split("\n")[3]).toBe(`${BASE}/p/4821?r=l`);
  });

  it("uppercases the first letter", () => {
    expect(share("won", 2, false, "q").split("\n")[0]).toBe("I spy something beginning with Q…");
  });
});

describe("no leaks", () => {
  const answers = (words as { word: string }[]).map((w) => w.word).slice(0, 200);
  const results: ["won" | "lost", number][] = [1, 2, 3, 4, 5, 6].map((n) => ["won", n]);
  results.push(["lost", 6]);

  it("uses 200 sample answers", () => expect(answers).toHaveLength(200));

  it("varies only in the first-letter slot, with no digits beyond counts and puzzle number", () => {
    for (const [status, n] of results) {
      const template = share(status, n, true, "_");
      for (const answer of answers) {
        const text = share(status, n, true, answer.charAt(0));
        const slot = `beginning with ${answer.charAt(0).toUpperCase()}…`;
        // Everything outside the slot is fixed copy, the same for every answer.
        expect(text.replace(slot, "beginning with _…")).toBe(template);
        const allowed = new Set(`${n}64821`);
        for (const digit of text.match(/\d/g) ?? []) expect(allowed).toContain(digit);
      }
    }
  });
});

describe("parseResultParam", () => {
  it.each([
    ["w1", { status: "won", guessesUsed: 1 }],
    ["w6", { status: "won", guessesUsed: 6 }],
    ["l", { status: "lost" }],
    ["w0", null],
    ["w7", null],
    ["W3", null],
    ["", null],
    [null, null],
  ])("parses %s", (r, expected) => {
    expect(parseResultParam(r)).toEqual(expected);
  });
});

describe("shareImageAlt", () => {
  it("describes the result without the answer", () => {
    expect(shareImageAlt(4821, "s", { status: "won", guessesUsed: 5 })).toBe(
      "I spydle puzzle 4821: something beginning with S. Sharp eyes: spied it in 5/6.",
    );
    expect(shareImageAlt(4821, "s", null)).toBe(
      "I spydle puzzle 4821: something beginning with S. Can you spot it?",
    );
  });
});
