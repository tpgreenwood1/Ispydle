import {
  LAST_CHANCE_GUESSES,
  MAX_GUESSES,
  SHARE_CLUE_LOSS_RATING,
  SHARE_LOSS_RATING,
  SHARE_WIN_RATINGS,
} from "./config.js";

// Everything shared here is spoiler-free: the only fact about the answer it takes is the first
// letter, which every player sees anyway (share-spec §1).

export type ShareResult =
  { status: "won"; guessesUsed: number } | { status: "lost"; tookClue: boolean };

/** The result of a finished game: more than MAX_GUESSES used means the last chance was taken. */
export const shareResultFor = (status: "won" | "lost", guessesUsed: number): ShareResult =>
  status === "won" ? { status, guessesUsed } : { status, tookClue: guessesUsed > MAX_GUESSES };

const tookClue = (result: ShareResult) =>
  result.status === "won" ? result.guessesUsed > MAX_GUESSES : result.tookClue;

export function rating(result: ShareResult): { title: string; emoji: string } {
  if (result.status === "lost") return result.tookClue ? SHARE_CLUE_LOSS_RATING : SHARE_LOSS_RATING;
  const row = SHARE_WIN_RATINGS.find((r) => result.guessesUsed <= r.upTo);
  if (!row) throw new Error(`SHARE_WIN_RATINGS has no row for ${result.guessesUsed} guesses`);
  return row;
}

/** The `r` URL param: `w1`…`w7` for a win in n (7 with the clue), `l` for a loss, `l7` for a loss with the clue. */
export function resultParam(result: ShareResult) {
  if (result.status === "won") return `w${result.guessesUsed}`;
  return result.tookClue ? `l${LAST_CHANCE_GUESSES}` : "l";
}

/** Parses an `r` URL param; null if it is missing or malformed. */
export function parseResultParam(r: string | null): ShareResult | null {
  if (r === "l") return { status: "lost", tookClue: false };
  if (r === `l${LAST_CHANCE_GUESSES}`) return { status: "lost", tookClue: true };
  const match = new RegExp(`^w([1-${LAST_CHANCE_GUESSES}])$`).exec(r ?? "");
  return match ? { status: "won", guessesUsed: Number(match[1]) } : null;
}

/**
 * The image's pip row as emoji: won in 3 is ⚫⚫🟢⚪⚪⚪, a loss is all ⚫. The last chance adds 💡
 * then its pip: ⚫⚫⚫⚫⚫⚫💡🟢 for a win, ⚫⚫⚫⚫⚫⚫💡⚫ for a loss.
 */
export function pipsLine(result: ShareResult): string {
  const won = result.status === "won";
  const used = won ? result.guessesUsed : result.tookClue ? LAST_CHANCE_GUESSES : MAX_GUESSES;
  const pips = Array.from({ length: Math.max(MAX_GUESSES, used) }, (_, i): string => {
    if (i >= used) return "⚪";
    return won && i === used - 1 ? "🟢" : "⚫";
  });
  if (tookClue(result)) pips.splice(MAX_GUESSES, 0, "💡");
  return pips.join("");
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
  const result = shareResultFor(status, guessesUsed);
  const { title, emoji } = rating(result);
  let line = `${emoji} ${title}: couldn't spot it in ${maxGuesses}. Can you?`;
  if (status === "won") {
    const how = tookClue(result) ? "on the last chance" : `in ${guessesUsed}/${maxGuesses}`;
    line = `${emoji} ${title}: spied it ${how}. Can you beat me?`;
  } else if (tookClue(result)) {
    line = `${emoji} ${title}. Can you spot it?`;
  }
  const query = withResultParam ? `?r=${resultParam(result)}` : "";
  return [headline(firstLetter), line, pipsLine(result), `${baseUrl}/p/${puzzleNo}${query}`].join(
    "\n",
  );
}

/** The result line drawn on the share image; null result means the neutral challenge card. */
export function imageResultLine(result: ShareResult | null): string {
  if (!result) return "Can you spot it?";
  const { title } = rating(result);
  if (result.status === "lost") return result.tookClue ? title : `${title}: couldn't spot it`;
  return tookClue(result)
    ? `${title}: spied it on the last chance`
    : `${title}: spied it in ${result.guessesUsed}/${MAX_GUESSES}`;
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
