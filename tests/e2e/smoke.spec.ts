import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { expect, test, type Page } from "@playwright/test";
import { MAX_WORD_LEN } from "../../shared/config";

interface Fixture {
  puzzleNo: number;
  word: string;
  category: string;
  guesses: string[];
}

/** One active puzzle plus three valid, wrong guesses that share its first letter. */
async function loadFixture(): Promise<Fixture> {
  const sql = neon(process.env.DATABASE_URL ?? "");
  const [puzzle] = await sql`
    select puzzle_no, word, category from puzzles
    where active and length(word) <= ${MAX_WORD_LEN} order by puzzle_no limit 1`;
  if (!puzzle) throw new Error("No active puzzles: run pnpm seed");
  const word = puzzle.word as string;
  const rows = await sql`
    select word from dictionary
    where word like ${word[0] + "%"} and word <> ${word} and length(word) between 3 and 7
    order by word limit 3`;
  return {
    puzzleNo: puzzle.puzzle_no as number,
    word,
    category: puzzle.category as string,
    guesses: rows.map((r) => r.word as string),
  };
}

async function guess(page: Page, word: string) {
  await page.keyboard.type(word);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/guess")),
    page.keyboard.press("Enter"),
  ]);
}

test("plays a puzzle from first letter to shared result", async ({ page, baseURL }) => {
  const fx = await loadFixture();
  const firstLetter = fx.word.charAt(0);

  // Capture what Share copies (headless Chromium has no share sheet).
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", { value: undefined });
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (text: string) => {
          (window as unknown as { shared: string }).shared = text;
        },
      },
    });
  });

  // Record every API response body until the game ends.
  const bodies: string[] = [];
  let ended = false;
  page.on("response", async (res) => {
    if (!res.url().includes("/api/") || ended) return;
    const body = await res.text().catch(() => "");
    if (!ended) bodies.push(body);
  });

  await page.goto(`/p/${fx.puzzleNo}`);
  await page.getByRole("button", { name: "Let’s play" }).click();
  await expect(page.getByText(`Word #${fx.puzzleNo}`)).toBeVisible();

  // An invalid guess shows a toast and does not cost a guess.
  await guess(page, (firstLetter === "z" ? "q" : "z") + "ebra");
  await expect(page.locator(".toast")).toHaveText(`Must start with ${firstLetter.toUpperCase()}`);
  await expect(page.getByText("6 guesses left", { exact: true })).toBeVisible();
  // The rejected guess stays typed, so delete it.
  for (let i = 0; i < 5; i++) await page.keyboard.press("Backspace");

  const caption = page.getByText(/^\d+ letters$/);
  for (const [i, word] of fx.guesses.entries()) {
    await guess(page, word);
    await expect(page.getByText(`${5 - i} guesses left`, { exact: true })).toBeVisible();
    // The length appears after guess 2 and not before.
    if (i < 1) await expect(caption).toHaveCount(0);
  }
  await expect(caption).toHaveText(`${fx.word.length} letters`);

  ended = true;
  await guess(page, fx.word);
  const result = page.getByRole("dialog", { name: "Spotted it! 4/6" });
  await expect(result).toBeVisible();
  await expect(result.getByText(`Category: ${fx.category}`)).toBeVisible();

  // No response before the end revealed the answer.
  expect(bodies.length).toBeGreaterThan(0);
  for (const body of bodies) expect(body).not.toContain(`"${fx.word}"`);

  await result.getByRole("button", { name: "Share" }).click();
  await expect(page.locator(".toast")).toHaveText("Copied");
  const shared = await page.evaluate(() => (window as unknown as { shared: string }).shared);

  // Fixed copy plus the first letter: nothing else about the answer can appear.
  expect(shared).toBe(
    [
      `I spy something beginning with ${firstLetter.toUpperCase()}…`,
      "👁️ Sharp eyes: spied it in 4/6. Can you beat me?",
      `${baseURL}/p/${fx.puzzleNo}?r=w4`,
    ].join("\n"),
  );
});
