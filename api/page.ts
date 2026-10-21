import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { MAX_GUESSES } from "../shared/config.js";
import { headline, parseResultParam, shareImageAlt, shareImagePath } from "../shared/share.js";
import { withErrors } from "./_lib/http.js";
import { getPuzzle } from "./_lib/queries.js";

// Serves /p/:puzzleNo (rewritten here by vercel.json): the built SPA with per-puzzle Open Graph
// tags, so link previews show the share card. Only the first letter of the answer is used.

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const meta = (attr: "property" | "name", key: string, content: string) =>
  `<meta ${attr}="${key}" content="${escapeHtml(content)}" />`;

const GENERIC_TAGS = [
  meta("property", "og:title", "I spydle"),
  meta(
    "property",
    "og:description",
    "I spy with my little eye… a word game. Guess the hidden word from its first letter.",
  ),
  meta("name", "twitter:card", "summary"),
];

export const GET = withErrors(async (req) => {
  const url = new URL(req.url);
  const no = url.searchParams.get("no") ?? "";
  const result = parseResultParam(url.searchParams.get("r"));

  let firstLetter: string | null = null;
  let lookupFailed = false;
  if (/^\d{1,9}$/.test(no)) {
    try {
      firstLetter = (await getPuzzle(Number(no)))?.word.charAt(0) ?? null;
    } catch (err) {
      // Still serve the app: it shows its own error and retries.
      console.error(err);
      lookupFailed = true;
    }
  }

  let tags = GENERIC_TAGS;
  if (firstLetter) {
    const puzzleNo = Number(no);
    const image = shareImagePath({ puzzleNo, firstLetter, result, fmt: "og" });
    tags = [
      meta("property", "og:title", headline(firstLetter)),
      meta(
        "property",
        "og:description",
        `Can you spot it in ${MAX_GUESSES} guesses? Play I spydle.`,
      ),
      meta("property", "og:image", `${url.origin}${image}`),
      meta("property", "og:image:alt", shareImageAlt(puzzleNo, firstLetter, result)),
      meta("name", "twitter:card", "summary_large_image"),
    ];
  }

  const html = await readFile(join(process.cwd(), "dist/index.html"), "utf8");
  return new Response(html.replace("</head>", `  ${tags.join("\n    ")}\n  </head>`), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": lookupFailed ? "no-store" : "public, max-age=0, s-maxage=300",
    },
  });
});
