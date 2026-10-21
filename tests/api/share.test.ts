import { describe, expect, it, vi } from "vitest";

const INDEX_HTML = `<!doctype html><html><head><title>I spydle</title></head><body></body></html>`;

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  const readFile = (async (path: Parameters<typeof actual.readFile>[0], ...rest: unknown[]) =>
    String(path).endsWith("index.html")
      ? INDEX_HTML
      : (actual.readFile as (...a: unknown[]) => unknown)(path, ...rest)) as typeof actual.readFile;
  return { ...actual, default: { ...actual, readFile }, readFile };
});

vi.mock("../../api/_lib/queries", () => ({
  getPuzzle: vi.fn(async (no: number) =>
    no === 4821
      ? { puzzleNo: 4821, word: "sandal", category: "Clothing", clue: "Open shoe with straps" }
      : null,
  ),
  incrementCounter: vi.fn(async () => {}),
}));

const { GET: shareImage, CACHE_CONTROL } = await import("../../api/share-image");
const { GET: page } = await import("../../api/page");
const { POST: shareClicked } = await import("../../api/share-clicked");
const queries = await import("../../api/_lib/queries");

const image = (query: string) =>
  shareImage(new Request(`http://localhost/api/share-image?${query}`));

async function pngSize(res: Response) {
  const buf = Buffer.from(await res.arrayBuffer());
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), buf };
}

describe("GET /api/share-image", () => {
  it.each([
    ["card", 1080, 1350],
    ["og", 1200, 630],
  ])("renders a %s PNG at %ix%i with an immutable cache header", async (fmt, width, height) => {
    const res = await image(`l=s&n=4821&r=w5&fmt=${fmt}`);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(res.headers.get("Cache-Control")).toBe(CACHE_CONTROL);
    expect(CACHE_CONTROL).toBe("public, max-age=31536000, immutable");
    expect(await pngSize(res)).toMatchObject({ width, height });
  });

  it.each(["lens", "tiles", "eye"])("renders the %s style in both themes", async (style) => {
    for (const q of [`r=l&theme=dark`, `theme=light`]) {
      expect((await image(`l=w&n=12&style=${style}&${q}`)).status).toBe(200);
    }
  });

  it.each(["w7", "l7"])("renders the last-chance result %s", async (r) => {
    expect((await image(`l=s&n=4821&r=${r}`)).status).toBe(200);
  });

  it("is identical for the same params", async () => {
    const a = await pngSize(await image("l=q&n=7&r=w1&style=eye"));
    const b = await pngSize(await image("l=q&n=7&r=w1&style=eye"));
    expect(a.buf.equals(b.buf)).toBe(true);
  });

  it.each([
    ["a missing letter", "n=4821"],
    ["a missing number", "l=s"],
    ["an uppercase letter", "l=S&n=4821"],
    ["two letters", "l=sa&n=4821"],
    ["a non-numeric number", "l=s&n=48a"],
    ["a bad result", "l=s&n=4821&r=w8"],
    ["an empty result", "l=s&n=4821&r="],
    ["an unknown style", "l=s&n=4821&style=wordle"],
    ["an unknown theme", "l=s&n=4821&theme=sepia"],
    ["an unknown format", "l=s&n=4821&fmt=square"],
  ])("returns 400 for %s", async (_, query) => {
    expect((await image(query)).status).toBe(400);
  });
});

describe("GET /api/page", () => {
  const get = (query: string) => page(new Request(`https://ispydle.app/api/page?${query}`));

  it("injects tags with the first letter and an absolute image URL", async () => {
    const res = await get("no=4821&r=w5");
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=300");
    expect(html).toContain(
      `<meta property="og:title" content="I spy something beginning with S…" />`,
    );
    expect(html).toContain(
      `<meta property="og:image" content="https://ispydle.app/api/share-image?l=s&amp;n=4821&amp;r=w5&amp;fmt=og" />`,
    );
    expect(html).toContain(`content="I spydle puzzle 4821: something beginning with S. Sharp eyes`);
    expect(html).toContain(`<meta name="twitter:card" content="summary_large_image" />`);
    expect(html.indexOf("og:title")).toBeLessThan(html.indexOf("</head>"));
  });

  it("leaves the result out of the image when r is missing or malformed", async () => {
    for (const q of ["no=4821", `no=4821&r="><script>`]) {
      const html = await (await get(q)).text();
      expect(html).toContain("share-image?l=s&amp;n=4821&amp;fmt=og");
      expect(html).not.toContain("<script>");
    }
  });

  it("never includes the answer, category or clue", async () => {
    const html = (await (await get("no=4821&r=l")).text()).toLowerCase();
    for (const secret of ["sandal", "clothing", "open shoe"]) expect(html).not.toContain(secret);
  });

  it("serves the plain app with generic tags for an unknown puzzle", async () => {
    const res = await get("no=9");
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain(`<meta property="og:title" content="I spydle" />`);
    expect(html).not.toContain("og:image");
  });

  it("still serves the app, uncached, when the database is down", async () => {
    vi.mocked(queries.getPuzzle).mockRejectedValueOnce(new TypeError("fetch failed"));
    const res = await get("no=4821");
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(await res.text()).toContain(`content="I spydle"`);
  });
});

describe("POST /api/share-clicked", () => {
  it("increments the share_clicked counter", async () => {
    const res = await shareClicked(
      new Request("http://localhost/api/share-clicked", { method: "POST" }),
    );
    expect(res.status).toBe(204);
    expect(queries.incrementCounter).toHaveBeenCalledWith("share_clicked");
  });
});
