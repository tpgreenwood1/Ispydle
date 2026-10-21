import { readFile } from "node:fs/promises";
import { ImageResponse } from "@vercel/og";
import { createElement as h, type CSSProperties, type ReactNode } from "react";
import { MAX_GUESSES } from "../shared/config.js";
import { headline, imageResultLine, parseResultParam, type ShareResult } from "../shared/share.js";
import { error, rateLimited, withErrors } from "./_lib/http.js";

// Share image (share-spec §3). Never touches the database and never receives the answer.

const STYLES = ["lens", "tiles", "eye"] as const;
type Style = (typeof STYLES)[number];

const FORMATS = {
  card: { width: 1080, height: 1350 },
  og: { width: 1200, height: 630 },
};
type Format = keyof typeof FORMATS;

// Copied from src/styles/tokens.css: the renderer can't read CSS variables.
const THEMES = {
  light: {
    ground: "#EEF3FA",
    ink: "#14213D",
    muted: "#566179",
    confirmed: "#17794D",
    onConfirmed: "#FFFFFF",
    noHelp: "#DCE2EC",
    unknownDashed: "#8E9AB0",
    accent: "#F5B63A",
    onAccent: "#14213D",
  },
  dark: {
    ground: "#0F1B2D",
    ink: "#E8EEF8",
    muted: "#A3B1C9",
    confirmed: "#34C77B",
    onConfirmed: "#08170F",
    noHelp: "#26354D",
    unknownDashed: "#5E7191",
    accent: "#F5B63A",
    onAccent: "#0F1B2D",
  },
};
type Theme = keyof typeof THEMES;
type Colors = (typeof THEMES)[Theme];

export const CACHE_CONTROL = "public, max-age=31536000, immutable";

// Bundled with the function (see vercel.json includeFiles), never fetched at runtime.
const fonts = Promise.all([
  readFile(new URL("./_fonts/fredoka-latin-600-normal.woff", import.meta.url)),
  readFile(new URL("./_fonts/nunito-latin-700-normal.woff", import.meta.url)),
]);

const FREDOKA = "Fredoka";
const NUNITO = "Nunito";

const isOneOf = <T extends string>(list: readonly T[], value: string): value is T =>
  (list as readonly string[]).includes(value);

const defaultStyle = (): Style => {
  const env = process.env.SHARE_STYLE ?? "";
  return isOneOf(STYLES, env) ? env : "lens";
};

const row = (style: CSSProperties, ...children: ReactNode[]) =>
  h("div", { style: { display: "flex", alignItems: "center", ...style } }, ...children);

const column = (style: CSSProperties, ...children: ReactNode[]) =>
  h("div", { style: { display: "flex", flexDirection: "column", ...style } }, ...children);

const text = (style: CSSProperties, content: string) => h("div", { style }, content);

const svg = (width: number, viewBox: string, height: number, ...children: ReactNode[]) =>
  h("svg", { width, height, viewBox, xmlns: "http://www.w3.org/2000/svg" }, ...children);

/** A big letter centred in a box laid over a graphic. */
const overlayLetter = (box: CSSProperties, letter: string, size: number, color: string) =>
  row(
    { position: "absolute", justifyContent: "center", ...box },
    text({ fontFamily: FREDOKA, fontSize: size, lineHeight: 1, color }, letter),
  );

function wordmark(size: number, c: Colors) {
  return row(
    { gap: size * 0.3 },
    row(
      {
        width: size,
        height: size,
        borderRadius: size,
        justifyContent: "center",
        backgroundColor: c.accent,
      },
      svg(
        size * 0.6,
        "0 0 24 24",
        size * 0.6,
        h("circle", {
          cx: 10.5,
          cy: 10.5,
          r: 6.5,
          fill: "none",
          stroke: c.onAccent,
          strokeWidth: 2.6,
        }),
        h("path", {
          d: "M15.5 15.5l5 5",
          stroke: c.onAccent,
          strokeWidth: 2.6,
          strokeLinecap: "round",
        }),
      ),
    ),
    text({ fontFamily: FREDOKA, fontSize: size * 0.72, color: c.ink }, "I spydle"),
  );
}

// ---- Hero graphics. `lost` swaps the confirmed green for the muted tile colour. ----

/** A: magnifying glass, the letter in the glass. `size` is the square it fills. */
function lens(size: number, letter: string, c: Colors) {
  return h(
    "div",
    { style: { display: "flex", position: "relative", width: size, height: size } },
    svg(
      size,
      "0 0 100 100",
      size,
      h("path", { d: "M62 62L88 88", stroke: c.accent, strokeWidth: 12, strokeLinecap: "round" }),
      h("circle", { cx: 40, cy: 40, r: 31, fill: c.ground, stroke: c.accent, strokeWidth: 7 }),
      h("path", {
        d: "M10.9 29.4A31 31 0 0 1 29.4 10.9",
        fill: "none",
        stroke: "#FFFFFF",
        strokeWidth: 2.4,
        strokeLinecap: "round",
      }),
    ),
    overlayLetter(
      { left: 0, top: 0, width: size * 0.8, height: size * 0.8 },
      letter,
      size * 0.44,
      c.ink,
    ),
  );
}

/** B: the letter in a green circle, then four ghost circles (always four: never the length). */
function tiles(width: number, letter: string, c: Colors, lost: boolean) {
  const gap = width * 0.03;
  const d = (width - gap * 4) / 5;
  const ghost = () =>
    h("div", {
      style: {
        width: d,
        height: d,
        borderRadius: d,
        border: `${Math.round(d * 0.035)}px dashed ${c.unknownDashed}`,
      },
    });
  return row(
    { gap },
    row(
      {
        width: d,
        height: d,
        borderRadius: d,
        justifyContent: "center",
        backgroundColor: lost ? c.noHelp : c.confirmed,
      },
      text(
        {
          fontFamily: FREDOKA,
          fontSize: d * 0.62,
          lineHeight: 1,
          color: lost ? c.ink : c.onConfirmed,
        },
        letter,
      ),
    ),
    ghost(),
    ghost(),
    ghost(),
    ghost(),
  );
}

/** C: an almond eye with the letter on a green iris. */
function eye(width: number, letter: string, c: Colors, lost: boolean) {
  const height = width * 0.6;
  return h(
    "div",
    { style: { display: "flex", position: "relative", width, height } },
    svg(
      width,
      "0 0 100 60",
      height,
      h("path", {
        d: "M5 30Q50 -22 95 30Q50 82 5 30Z",
        fill: c.ground,
        stroke: c.ink,
        strokeWidth: 3.2,
        strokeLinejoin: "round",
      }),
      h("circle", { cx: 50, cy: 30, r: 20, fill: lost ? c.noHelp : c.confirmed }),
      h("circle", { cx: 62.5, cy: 17.5, r: 2.2, fill: "#FFFFFF", opacity: 0.85 }),
    ),
    overlayLetter(
      { left: 0, top: 0, width, height },
      letter,
      width * 0.26,
      lost ? c.ink : c.onConfirmed,
    ),
  );
}

// Width of each graphic per format; og gives the graphic a 480px column.
const HERO_WIDTH: Record<Format, Record<Style, number>> = {
  card: { lens: 600, tiles: 780, eye: 840 },
  og: { lens: 400, tiles: 440, eye: 480 },
};

function hero(style: Style, fmt: Format, letter: string, c: Colors, lost: boolean) {
  const width = HERO_WIDTH[fmt][style];
  if (style === "tiles") return tiles(width, letter, c, lost);
  if (style === "eye") return eye(width, letter, c, lost);
  return lens(width, letter, c);
}

/** The last-chance marker drawn before the 7th pip. */
const bulb = (size: number, c: Colors) =>
  svg(
    size,
    "0 0 24 24",
    size,
    h("path", { d: "M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2Z", fill: c.accent }),
    h("rect", { x: 9, y: 18.5, width: 6, height: 3, rx: 1.2, fill: c.ink }),
  );

function pips(size: number, result: ShareResult | null, c: Colors) {
  const filled = result?.status === "won" ? result.guessesUsed : result ? MAX_GUESSES : 0;
  const lastChance =
    result?.status === "won" ? result.guessesUsed > MAX_GUESSES : (result?.tookClue ?? false);
  const pip = (i: number) => {
    let fill: string | undefined;
    if (result?.status === "lost") fill = c.noHelp;
    else if (i === filled - 1) fill = c.confirmed;
    else if (i < filled) fill = c.ink;
    // The renderer rejects undefined style values, so set one property or the other.
    const paint = fill
      ? { backgroundColor: fill }
      : { border: `${Math.round(size * 0.12)}px solid ${c.unknownDashed}` };
    return h("div", { style: { width: size, height: size, borderRadius: size, ...paint } });
  };
  return row(
    { gap: size * 0.4 },
    ...Array.from({ length: MAX_GUESSES }, (_, i) => pip(i)),
    ...(lastChance ? [bulb(size, c), pip(MAX_GUESSES)] : []),
  );
}

interface Params {
  letter: string;
  puzzleNo: number;
  result: ShareResult | null;
  style: Style;
  theme: Theme;
  fmt: Format;
}

function render({ letter, puzzleNo, result, style, theme, fmt }: Params) {
  const c = THEMES[theme];
  const L = letter.toUpperCase();
  const lost = result?.status === "lost";
  const card = fmt === "card";
  const s = card ? 1 : 0.68; // og text runs smaller to fit the wide, short canvas

  const textBlock = column(
    { alignItems: card ? "center" : "flex-start", gap: 28 * s },
    text(
      {
        fontFamily: NUNITO,
        fontSize: 76 * s,
        lineHeight: 1.15,
        color: c.ink,
        textAlign: card ? "center" : "left",
      },
      headline(letter),
    ),
    text({ fontFamily: NUNITO, fontSize: 46 * s, color: c.ink }, imageResultLine(result)),
    pips(44 * s, result, c),
    column(
      { alignItems: card ? "center" : "flex-start", gap: 6 * s, marginTop: 12 * s },
      text(
        { fontFamily: NUNITO, fontSize: 44 * s, color: c.ink },
        result ? "Can you beat me?" : "Play now",
      ),
      text({ fontFamily: NUNITO, fontSize: 34 * s, color: c.muted }, `ispydle.app · #${puzzleNo}`),
    ),
  );

  const base: CSSProperties = { width: "100%", height: "100%", backgroundColor: c.ground };
  if (card) {
    return column(
      { ...base, alignItems: "center", justifyContent: "space-between", padding: "72px 80px" },
      wordmark(72, c),
      row({ height: 620, justifyContent: "center" }, hero(style, fmt, L, c, lost)),
      textBlock,
    );
  }
  return row(
    { ...base, padding: "48px 64px", gap: 48 },
    row({ width: 480, height: 534, justifyContent: "center" }, hero(style, fmt, L, c, lost)),
    column({ flex: 1, gap: 30, justifyContent: "center" }, wordmark(52, c), textBlock),
  );
}

function parseParams(url: URL): Params | null {
  const q = url.searchParams;
  const letter = q.get("l") ?? "";
  const n = q.get("n") ?? "";
  const r = q.get("r");
  const style = q.get("style") ?? defaultStyle();
  const theme = q.get("theme") ?? "light";
  const fmt = q.get("fmt") ?? "card";

  const result = r === null ? null : parseResultParam(r);
  if (!/^[a-z]$/.test(letter) || !/^\d{1,9}$/.test(n) || (r !== null && !result)) return null;
  if (!isOneOf(STYLES, style) || !(theme in THEMES) || !(fmt in FORMATS)) return null;
  return { letter, puzzleNo: Number(n), result, style, theme: theme as Theme, fmt: fmt as Format };
}

export const GET = withErrors(async (req) => {
  const limited = rateLimited(req);
  if (limited) return limited;

  const params = parseParams(new URL(req.url));
  if (!params) return error(400, "Bad share image params");

  const [fredoka, nunito] = await fonts;
  const res = new ImageResponse(render(params), {
    ...FORMATS[params.fmt],
    fonts: [
      { name: FREDOKA, data: fredoka, weight: 600, style: "normal" },
      { name: NUNITO, data: nunito, weight: 700, style: "normal" },
    ],
  });
  // Set after construction: a `headers` option is appended to the library's own value.
  res.headers.set("Cache-Control", CACHE_CONTROL);
  return res;
});
