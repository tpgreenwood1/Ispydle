import { expect, test, type Page } from "@playwright/test";
import { evaluateGuesses } from "../../shared/evaluate";
import type { GuessRequest } from "../../shared/types";

// The puzzle API is mocked with the real game rules (no database needed).

const SIX_MISSES = ["spoon", "sofa", "salad", "sandy", "sand", "sane"];
const CLUE = "Open shoe with straps for summer";

async function mockPuzzle(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { copied?: string };
    Object.defineProperty(navigator, "share", { value: undefined });
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: async (text: string) => void (w.copied = text) },
    });
  });
  await page.route("**/api/share-clicked", (route) => route.fulfill({ status: 204 }));
  await page.route("**/api/puzzles/4821", (route) =>
    route.fulfill({ json: { puzzleNo: 4821, firstLetter: "s" } }),
  );
  await page.route("**/api/puzzles/4821/guess", (route) => {
    const body = route.request().postDataJSON() as GuessRequest;
    const state = evaluateGuesses("sandal", { category: "Clothing", clue: CLUE }, body.guesses, {
      category: body.revealCategory,
      clue: body.revealClue,
      giveUp: body.giveUp,
    });
    return route.fulfill({ json: { valid: true, state } });
  });
}

async function guess(page: Page, word: string) {
  await page.keyboard.type(word);
  await page.keyboard.press("Enter");
}

async function missSix(page: Page) {
  await page.goto("/p/4821");
  await page.getByRole("button", { name: "Let’s play" }).click();
  for (const [i, word] of SIX_MISSES.entries()) {
    await guess(page, word);
    const left = 5 - i;
    if (left > 0) {
      await expect(
        page.getByText(`${left} ${left === 1 ? "guess" : "guesses"} left`, { exact: true }),
      ).toBeVisible();
    }
  }
  await expect(page.getByText("Out of guesses! Take a last chance with the clue?")).toBeVisible();
  await expect(page.getByText("Last chance", { exact: true })).toBeVisible();
  await expect(page.getByLabel(/Your guess/)).toHaveCount(0);
}

test("hides the clue until the last chance, then wins with it", async ({ page, baseURL }) => {
  await mockPuzzle(page);
  await missSix(page);
  const clueStrip = page.locator(".clue", { hasText: `Clue: ${CLUE}` });
  await expect(clueStrip).toHaveCount(0);

  await page.getByRole("button", { name: "Show clue" }).click();
  await expect(clueStrip).toBeVisible();
  await guess(page, "sandal");

  const result = page.getByRole("dialog", { name: "Spotted it with the clue!" });
  await expect(result).toBeVisible();
  await result.getByRole("button", { name: "Share" }).click();
  await expect(page.locator(".toast")).toHaveText("Copied");
  const copied = await page.evaluate(() => (window as unknown as { copied?: string }).copied);
  expect(copied).toBe(
    [
      "I spy something beginning with S…",
      "💡 Needed a clue: spied it on the last chance. Can you beat me?",
      "⚫⚫⚫⚫⚫⚫💡🟢",
      `${baseURL}/p/4821?r=w7`,
    ].join("\n"),
  );
});

test("gives up, and stays finished after a reload", async ({ page }) => {
  await mockPuzzle(page);
  await missSix(page);

  await page.getByRole("button", { name: "Give up" }).click();
  await expect(page.getByRole("dialog", { name: "It was SANDAL" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("dialog", { name: "It was SANDAL" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Show clue" })).toHaveCount(0);
});

test("keeps a game lost before the last chance existed as lost", async ({ page }) => {
  await mockPuzzle(page);
  await page.addInitScript((guesses) => {
    localStorage.setItem("ispydle:v1:seen-help", "true");
    localStorage.setItem(
      "ispydle:v1:games",
      JSON.stringify({ 4821: { guesses, status: "lost", startedAt: 1 } }),
    );
  }, SIX_MISSES);

  await page.goto("/p/4821");
  await expect(page.getByRole("dialog", { name: "It was SANDAL" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Show clue" })).toHaveCount(0);
});
