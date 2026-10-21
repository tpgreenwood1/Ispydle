import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { expect, test } from "@playwright/test";
import { MAX_WORD_LEN } from "../../shared/config";

test("losing the connection mid-game is recoverable", async ({ page, context }) => {
  const sql = neon(process.env.DATABASE_URL ?? "");
  const [puzzle] =
    await sql`select puzzle_no, word from puzzles where active and length(word) <= ${MAX_WORD_LEN} order by puzzle_no limit 1`;
  if (!puzzle) throw new Error("No active puzzles: run pnpm seed");
  const word = puzzle.word as string;
  const [other] = await sql`
    select word from dictionary where word like ${word[0] + "%"} and word <> ${word} limit 1`;
  const guessWord = (other?.word as string).replace(/^./, (c) => c.toUpperCase());

  await page.goto(`/p/${puzzle.puzzle_no}`);
  await page.getByRole("button", { name: "Let’s play" }).click();
  const input = page.getByLabel(/Your guess/);
  await expect(input).toBeVisible();

  await context.setOffline(true);
  await expect(page.getByText(/You’re offline/)).toBeVisible();

  // Typed with a capital first letter and submitted with Enter.
  await input.fill(guessWord);
  await input.press("Enter");
  await expect(page.locator(".toast")).toHaveText(/No connection/);
  await expect(input).toHaveValue(guessWord); // kept, so it can be sent again
  await expect(page.getByText("6 guesses left", { exact: true })).toBeVisible();

  await context.setOffline(false);
  await expect(page.getByText(/You’re offline/)).toHaveCount(0);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/guess")),
    input.press("Enter"),
  ]);
  await expect(page.getByText("5 guesses left", { exact: true })).toBeVisible();
  await expect(input).toHaveValue("");
});

test("a failed load retries when the connection returns", async ({ page, context }) => {
  const sql = neon(process.env.DATABASE_URL ?? "");
  const [puzzle] =
    await sql`select puzzle_no from puzzles where active and length(word) <= ${MAX_WORD_LEN} order by puzzle_no limit 1`;

  await page.goto("/");
  await page.getByRole("button", { name: "Let’s play" }).click();
  // Fail the puzzle request the way a dropped connection would.
  await page.route("**/api/puzzles/*", (route) => route.abort("internetdisconnected"));
  await page.goto(`/p/${puzzle?.puzzle_no}`);
  await expect(page.getByRole("heading", { name: "Couldn’t load the game" })).toBeVisible();
  await expect(page.getByText(/No connection/)).toBeVisible();

  await page.unroute("**/api/puzzles/*");
  await context.setOffline(true);
  await context.setOffline(false); // fires the "online" event
  await expect(page.getByText(/guesses left/)).toBeVisible();
});
