import { expect, test, type Page } from "@playwright/test";

// The puzzle API is mocked (no database needed); /api/share-image is the real endpoint.

const WON = {
  rows: [{ word: "sandal", matched: 6 }],
  knownPrefixLen: 6,
  status: "won",
  guessesUsed: 1,
  wordLength: 6,
  categoryAvailable: false,
  category: "Clothing",
  clueAvailable: false,
  clue: null,
  answer: "sandal",
};

interface Shared {
  text?: string;
  url?: string;
  files?: { name: string; type: string; size: number }[];
}

type ShareStub = "files" | "text-only" | "none";

async function winGame(page: Page, stub: ShareStub) {
  await page.addInitScript((stub: ShareStub) => {
    const w = window as unknown as { shared?: Shared; copied?: string };
    Object.defineProperty(navigator, "share", {
      value:
        stub === "none"
          ? undefined
          : async (data: ShareData) => {
              w.shared = {
                text: data.text,
                url: data.url,
                files: data.files?.map((f) => ({ name: f.name, type: f.type, size: f.size })),
              };
            },
    });
    Object.defineProperty(navigator, "canShare", {
      value: stub === "none" ? undefined : () => stub === "files",
    });
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: async (text: string) => void (w.copied = text) },
    });
  }, stub);

  const counted: string[] = [];
  await page.route("**/api/share-clicked", (route) => {
    counted.push(route.request().method());
    return route.fulfill({ status: 204 });
  });
  await page.route("**/api/puzzles/4821", (route) =>
    route.fulfill({ json: { puzzleNo: 4821, firstLetter: "s" } }),
  );
  await page.route("**/api/puzzles/4821/guess", (route) =>
    route.fulfill({ json: { valid: true, state: WON } }),
  );

  await page.goto("/p/4821");
  await page.getByRole("button", { name: "Let’s play" }).click();
  const input = page.getByLabel(/Your guess/);
  await input.fill("sandal");
  await input.press("Enter");
  const result = page.getByRole("dialog", { name: "Spotted it! 1/6" });
  await expect(result).toBeVisible();
  return { result, counted };
}

const TEXT = (baseURL: string | undefined) =>
  [
    "I spy something beginning with S…",
    "🦅 Eagle eyes: spied it in 1/6. Can you beat me?",
    "🟢⚪⚪⚪⚪⚪",
    `${baseURL}/p/4821?r=w1`,
  ].join("\n");

const shared = (page: Page) =>
  page.evaluate(() => (window as unknown as { shared?: Shared }).shared);

test("shares the text without attaching the image, even when files are supported", async ({
  page,
  baseURL,
}) => {
  const { result, counted } = await winGame(page, "files");

  const preview = result.getByRole("img", { name: /I spydle puzzle 4821/ });
  await expect(preview).toBeVisible();
  await expect(preview).toHaveAttribute("src", /\/api\/share-image\?l=s&n=4821&r=w1/);
  await expect(result.getByRole("link", { name: "Save image" })).toHaveAttribute(
    "download",
    "ispydle-4821.png",
  );

  await result.getByRole("button", { name: "Share" }).click();
  await expect.poll(() => shared(page)).toBeDefined();
  expect(await shared(page)).toEqual({ text: TEXT(baseURL) });
  expect(counted).toEqual(["POST"]);
});

test("copies the text when Web Share is unavailable", async ({ page, baseURL }) => {
  const { result } = await winGame(page, "none");
  await result.getByRole("button", { name: "Share" }).click();
  await expect(page.locator(".toast")).toHaveText("Copied");
  const copied = await page.evaluate(() => (window as unknown as { copied?: string }).copied);
  expect(copied).toBe(TEXT(baseURL));
});
