import { describe, expect, it } from "vitest";
import { validateGuess } from "../../shared/validateGuess";

const dictionary = new Set(["spoon", "sofa", "salad", "sandy", "sandal", "so", "sandwiches"]);
const inDictionary = (w: string) => dictionary.has(w);
const validate = (guess: string, prior: string[] = []) =>
  validateGuess(guess, "s", prior, inDictionary);

describe("validateGuess", () => {
  it("accepts a valid guess", () => {
    expect(validate("spoon")).toBeNull();
  });

  it.each(["s", "abcdefghijklm", "Spoon", "spo-on", "spoon ", "", "sößa"])(
    "rejects %j as BAD_FORMAT",
    (guess) => {
      expect(validate(guess)).toBe("BAD_FORMAT");
    },
  );

  it("accepts the length bounds (2 and 12)", () => {
    expect(validateGuess("so", "s", [], () => true)).toBeNull();
    expect(validateGuess("sabcdefghijk", "s", [], () => true)).toBeNull();
  });

  it("rejects the wrong first letter", () => {
    expect(validate("table")).toBe("WRONG_FIRST_LETTER");
  });

  it("rejects words not in the dictionary", () => {
    expect(validate("sxyz")).toBe("NOT_IN_DICTIONARY");
  });

  it("rejects repeated guesses", () => {
    expect(validate("sofa", ["spoon", "sofa"])).toBe("ALREADY_GUESSED");
  });
});
