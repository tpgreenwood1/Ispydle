import { MAX_GUESSES, SHARE_LOSS_RATING, SHARE_WIN_RATINGS } from "./config.js";

// Everything shared here is spoiler-free: the only fact about the answer it takes is the first
// letter, which every player sees anyway (share-spec §1).

export type ShareResult = { status: "won"; guessesUsed: number } | { status: "lost" };

export function rating(result: ShareResult): { title: string; emoji: string } {
  if (result.status === "lost") return SHARE_LOSS_RATING;
  const row = SHARE_WIN_RATINGS.find((r) => result.guessesUsed <= r.upTo);
  if (!row) throw new Error(`SHARE_WIN_RATINGS has no row for ${result.guessesUsed} guesses`);
  return row;
}

/** The `r` URL param: `w1`…`w6` for a win in n, `l` for a loss. */
export const resultParam = (result: ShareResult) =>
  result.status === "won" ? `w${result.guessesUsed}` : "l";

/** Parses an `r` URL param; null if it is missing or malformed. */
export function parseResultParam(r: string | null): ShareResult | null {
  if (r === "l") return { status: "lost" };
  const match = new RegExp(`^w([1-${MAX_GUESSES}])$`).exec(r ?? "");
  return match ? { status: "won", guessesUsed: Number(match[1]) } : null;
}

/** The image's pip row as emoji: won in 3 is ⚫⚫🟢⚪⚪⚪, a loss is all ⚫. */
export function pipsLine(result: ShareResult): string {
  const used = result.status === "won" ? result.guessesUsed : MAX_GUESSES;
  return Array.from({ length: MAX_GUESSES }, (_, i) => {
    if (i >= used) return "⚪";
    return result.status === "won" && i === used - 1 ? "🟢" : "⚫";
  }).join("");
}

export const headline = (firstLetter: string) =>
  `I spy something beginning with ${firstLetter.toUpperCase()}…`;

interface ShareTextInput {
  puzzleNo: number;
  firstLetter: string;
  status: "won" | "lost";
  guessesUsed: number;
  maxGuesses: number;
  baseUrl: string;
  withResultParam: boolean;
}

export function buildShareText({
  puzzleNo,
  firstLetter,
  status,
  guessesUsed,
  maxGuesses,
  baseUrl,
  withResultParam,
}: ShareTextInput): string {
  const result: ShareResult = status === "won" ? { status, guessesUsed } : { status };
  const { title, emoji } = rating(result);
  const line =
    status === "won"
      ? `${emoji} ${title}: spied it in ${guessesUsed}/${maxGuesses}. Can you beat me?`
      : `${emoji} ${title}: couldn't spot it in ${maxGuesses}. Can you?`;
  const query = withResultParam ? `?r=${resultParam(result)}` : "";
  return [headline(firstLetter), line, pipsLine(result), `${baseUrl}/p/${puzzleNo}${query}`].join("\n");
}

/** The result line drawn on the share image; null result means the neutral challenge card. */
export function imageResultLine(result: ShareResult | null): string {
  if (!result) return "Can you spot it?";
  const { title } = rating(result);
  return result.status === "won"
    ? `${title}: spied it in ${result.guessesUsed}/${MAX_GUESSES}`
    : `${title}: couldn't spot it`;
}

export function shareImageAlt(puzzleNo: number, firstLetter: string, result: ShareResult | null) {
  const line = imageResultLine(result);
  const sentence = result ? `${line}.` : line;
  return `I spydle puzzle ${puzzleNo}: something beginning with ${firstLetter.toUpperCase()}. ${sentence}`;
}

interface ShareImageInput {
  puzzleNo: number;
  firstLetter: string;
  result: ShareResult | null;
  fmt: "card" | "og";
  theme?: "light" | "dark";
}

/** Path to the share image; the style is left to the server's SHARE_STYLE default. */
export function shareImagePath({ puzzleNo, firstLetter, result, fmt, theme }: ShareImageInput) {
  const params = new URLSearchParams({ l: firstLetter.toLowerCase(), n: String(puzzleNo) });
  if (result) params.set("r", resultParam(result));
  if (theme && theme !== "light") params.set("theme", theme);
  params.set("fmt", fmt);
  return `/api/share-image?${params}`;
}
