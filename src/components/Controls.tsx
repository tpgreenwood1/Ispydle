import { useEffect, useState, type ReactNode } from "react";
import { CATEGORY_HINT_AFTER, MAX_GUESSES, MAX_GUESS_LEN } from "../../shared/config";
import type { GameState } from "../../shared/types";
import { BackspaceIcon, LockIcon } from "./Icons";

interface CounterProps {
  guessesUsed: number;
  puzzleNo: number;
  /** The last-chance guess is on offer or being played. */
  lastChance: boolean;
}

export function Counter({ guessesUsed, puzzleNo, lastChance }: CounterProps) {
  const left = Math.max(0, MAX_GUESSES - guessesUsed);
  return (
    <div className="counter">
      <div className="pips">
        {Array.from({ length: MAX_GUESSES }, (_, i) => (
          <span key={i} className={`pip ${i < guessesUsed ? "used" : ""}`} aria-hidden="true" />
        ))}
        <span className="pips-label">
          {lastChance ? "Last chance" : `${left} ${left === 1 ? "guess" : "guesses"} left`}
        </span>
      </div>
      <span>Word #{puzzleNo}</span>
    </div>
  );
}

interface CategoryHintProps {
  state: GameState;
  onReveal: () => void;
}

/** Sits beside the length caption: locked, then a reveal button, then the category. */
export function CategoryHint({ state, onReveal }: CategoryHintProps) {
  if (state.category) {
    return <span className="hint">Category: {state.category}</span>;
  }
  if (state.categoryAvailable) {
    return (
      <button type="button" className="hint-button" onClick={onReveal}>
        Show category
      </button>
    );
  }
  return (
    <span className="hint locked">
      <LockIcon size={14} />
      Category unlocks after guess {CATEGORY_HINT_AFTER}
    </span>
  );
}

interface LastChanceOfferProps {
  onTake: () => void;
  onGiveUp: () => void;
}

/** Shown in place of the guess display after the last regular guess misses. */
export function LastChanceOffer({ onTake, onGiveUp }: LastChanceOfferProps) {
  return (
    <>
      <p className="last-chance">Out of guesses! Take a last chance with the clue?</p>
      <div className="actions">
        <button type="button" className="button" onClick={onGiveUp}>
          Give up
        </button>
        <button type="button" className="button primary" onClick={onTake}>
          Show clue
        </button>
      </div>
    </>
  );
}

interface GuessInputProps {
  firstLetter: string;
  /** A guess is being checked: further submits are ignored. */
  busy: boolean;
  /** Resolves true if accepted (clears the input), false if rejected (shakes), null if ignored. */
  onSubmit: (guess: string) => Promise<boolean | null>;
}

/** The typed guess and the on-screen keyboard. Physical keyboards type into it too. */
export function GuessInput({ firstLetter, busy, onSubmit }: GuessInputProps) {
  const [value, setValue] = useState("");
  const [shaking, setShaking] = useState(false);

  async function submit() {
    if (!value || busy) return;
    const accepted = await onSubmit(value);
    if (accepted) setValue("");
    else if (accepted === false) setShaking(true);
  }

  function press(key: string) {
    if (key === "Enter") void submit();
    else if (key === "Backspace") setValue((v) => v.slice(0, -1));
    else setValue((v) => (v.length < MAX_GUESS_LEN ? v + key : v));
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey || document.querySelector("dialog[open]")) return;
      // A button tabbed to handles its own Enter; one left focused by a click doesn't.
      if (e.key === "Enter" && e.target instanceof Element && e.target.matches(":focus-visible"))
        return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (key !== "Enter" && key !== "Backspace" && !/^[a-z]$/.test(key)) return;
      e.preventDefault();
      press(key);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <>
      <div
        className={`guess-display ${shaking ? "shake" : ""}`}
        role="textbox"
        aria-label={`Your guess, starting with ${firstLetter.toUpperCase()}`}
        aria-live="polite"
        data-placeholder={`${firstLetter.toUpperCase()}…`}
        onAnimationEnd={() => setShaking(false)}
      >
        {value}
      </div>
      <Keyboard onKey={press} busy={busy} />
    </>
  );
}

const KEY_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

interface KeyboardProps {
  /** Omit to show the keyboard disabled, when no guess can be typed. */
  onKey?: (key: string) => void;
  busy?: boolean;
}

/** Letters only, and always on screen, so the native keyboard never covers the board. */
export function Keyboard({ onKey, busy = false }: KeyboardProps) {
  return (
    <div className="keyboard" role="group" aria-label="Keyboard">
      {KEY_ROWS.map((row, i) => (
        <div key={row} className="keyboard-row">
          {i === 2 && (
            <Key value="Enter" className="wide enter" busy={busy} onKey={onKey}>
              {busy ? "…" : "Enter"}
            </Key>
          )}
          {row.split("").map((letter) => (
            <Key key={letter} value={letter} onKey={onKey}>
              {letter}
            </Key>
          ))}
          {i === 2 && (
            <Key value="Backspace" className="wide" label="Backspace" onKey={onKey}>
              <BackspaceIcon />
            </Key>
          )}
        </div>
      ))}
    </div>
  );
}

interface KeyProps {
  value: string;
  className?: string;
  label?: string;
  busy?: boolean;
  onKey?: (key: string) => void;
  children: ReactNode;
}

function Key({ value, className = "", label, busy, onKey, children }: KeyProps) {
  return (
    <button
      type="button"
      className={`key ${className}`}
      aria-label={label}
      aria-busy={busy}
      disabled={!onKey}
      // Don't take focus, so a physical Enter submits rather than re-pressing this key.
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onKey?.(value)}
    >
      {children}
    </button>
  );
}
