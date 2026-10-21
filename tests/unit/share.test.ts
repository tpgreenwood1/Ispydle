import { describe, expect, it } from "vitest";
import { evaluateGuesses } from "../../shared/evaluate";
import { buildShareText } from "../../shared/share";

const ORIGIN = "https://ispydle.example";

function share(guesses: string[]) {
  const state = evaluateGuesses("sandal", { category: "Clothing", clue: "Summer shoe" }, guesses);
  return buildShareText(4821, state.rows, state.status, ORIGIN);
}

describe("buildShareText", () => {
  it("builds a win: one square per guess, first guess always extends", () => {
    expect(share(["salad", "spoon", "sandy", "sandal"])).toBe(
      ["I spydle #4821 🔍 4/6", "🟩⬜🟩🟨", `${ORIGIN}/p/4821`].join("\n"),
    );
  });

  it("marks a guess that matches only the known prefix as no help", () => {
    expect(share(["spoon", "sofa", "salad", "sandal"]).split("\n")[1]).toBe("🟩⬜🟩🟨");
  });

  it("builds a loss as X/6 with no solved square", () => {
    const text = share(["spoon", "sofa", "salad", "sandy", "sand", "sane"]);
    expect(text.split("\n")[0]).toBe("I spydle #4821 🔍 X/6");
    expect(text.split("\n")[1]).toBe("🟩⬜🟩🟩⬜⬜");
    expect(text).not.toContain("🟨");
  });

  it("leaks no answer, letters, length, category or clue", () => {
    const text = share(["spoon", "sofa", "salad", "sandy", "sandal"]);
    const body = text.replace("I spydle", "").replace(`${ORIGIN}/p/4821`, "");
    expect(body).not.toMatch(/[a-z]/i);
    expect(body).not.toContain("6 letters");
    expect(text).not.toContain("Clothing");
    expect(text).not.toContain("Summer shoe");
  });
});
