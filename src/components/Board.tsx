import { useEffect, useRef } from "react";
import type { Row } from "../../shared/types";
import { MagnifierIcon } from "./Icons";

const POP_STAGGER_MS = 80;
const APPEAR_STAGGER_MS = 70;

interface ConfirmedTileProps {
  letter: string;
  /** Pop in after this many ms; omit for no animation. */
  popDelay?: number;
}

function ConfirmedTile({ letter, popDelay }: ConfirmedTileProps) {
  const pop = popDelay !== undefined;
  return (
    <span
      className={`tile confirmed ${pop ? "pop" : ""}`}
      style={pop ? { animationDelay: `${popDelay}ms` } : undefined}
    >
      {letter}
      <span className="sr-only"> confirmed</span>
    </span>
  );
}

interface PrefixRowProps {
  letters: string;
  /** Known prefix length before the latest guess; letters past it pop in. */
  prevLength: number;
  wordLength: number | null;
}

/** Top row: known prefix, then dashed slots (one before the length reveal, the rest after). */
export function PrefixRow({ letters, prevLength, wordLength }: PrefixRowProps) {
  const total = wordLength ?? letters.length + 1;
  return (
    <div className="grid">
      {Array.from({ length: total }, (_, i) => {
        const letter = letters[i];
        if (letter) {
          const popDelay = i >= prevLength ? (i - prevLength) * POP_STAGGER_MS : undefined;
          return <ConfirmedTile key={`c${i}`} letter={letter} popDelay={popDelay} />;
        }
        const revealed = wordLength !== null && i > letters.length;
        return (
          <span
            key={`u${i}`}
            className={`tile unknown ${revealed ? "appear" : ""}`}
            style={
              revealed
                ? { animationDelay: `${(i - letters.length) * APPEAR_STAGGER_MS}ms` }
                : undefined
            }
          />
        );
      })}
    </div>
  );
}

export function LengthCaption({ wordLength }: { wordLength: number | null }) {
  if (wordLength === null) return null;
  return (
    <span className="length-caption" aria-hidden="true">
      <MagnifierIcon size={16} />
      {wordLength} letters
    </span>
  );
}

interface GuessHistoryProps {
  rows: Row[];
  wordLength: number | null;
  /** Number of guess rows: MAX_GUESSES, plus one once the last chance is taken. */
  slots: number;
}

/** One row per guess slot. Unused slots are dashed after the length reveal, invisible before. */
export function GuessHistory({ rows, wordLength, slots }: GuessHistoryProps) {
  const lastRow = useRef<HTMLDivElement>(null);

  useEffect(() => {
    lastRow.current?.scrollIntoView({ block: "nearest" });
  }, [rows.length]);

  return (
    <div className="history" aria-hidden="true">
      {Array.from({ length: slots }, (_, i) => {
        const row = rows[i];
        if (row) {
          return (
            <div key={i} className="grid" ref={i === rows.length - 1 ? lastRow : undefined}>
              {row.word.split("").map((letter, j) =>
                j < row.matched ? (
                  <ConfirmedTile key={j} letter={letter} />
                ) : (
                  <span key={j} className="tile no-help">
                    {letter}
                  </span>
                ),
              )}
            </div>
          );
        }
        return (
          <div key={i} className="grid">
            {wordLength === null ? (
              <span className="tile ghost" />
            ) : (
              Array.from({ length: wordLength }, (_, j) => (
                <span key={j} className="tile placeholder" />
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}
