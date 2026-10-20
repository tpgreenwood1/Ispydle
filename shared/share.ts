import { MAX_GUESSES } from "./config.js";
import type { GameStatus, Row } from "./types.js";

/** One square per guess. The known prefix starts at 0, so a first guess always extends it. */
export function shareSquares(rows: readonly Row[], status: GameStatus): string {
  let known = 0;
  return rows
    .map((row, i) => {
      const extended = row.matched > known;
      known = Math.max(known, row.matched);
      if (status === "won" && i === rows.length - 1) return "🟨";
      return extended ? "🟩" : "⬜";
    })
    .join("");
}

export function buildShareText(
  puzzleNo: number,
  rows: readonly Row[],
  status: GameStatus,
  origin: string,
): string {
  const score = status === "won" ? rows.length : "X";
  return [
    `I spydle #${puzzleNo} 🔍 ${score}/${MAX_GUESSES}`,
    shareSquares(rows, status),
    `${origin}/p/${puzzleNo}`,
  ].join("\n");
}
