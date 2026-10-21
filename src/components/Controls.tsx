import { useState, type FormEvent } from "react";
import { CATEGORY_HINT_AFTER, MAX_GUESSES, MAX_GUESS_LEN } from "../../shared/config";
import type { GameState } from "../../shared/types";
import type { Hint } from "../hooks/useGame";
import { LockIcon } from "./Icons";

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

interface HintStripsProps {
  state: GameState;
  onReveal: (hint: Hint) => void;
}

/** The category hint, then the clue once the last chance is taken (or the game ends). */
export function HintStrips({ state, onReveal }: HintStripsProps) {
  return (
    <>
      <HintStrip
        text={state.category && `Category: ${state.category}`}
        available={state.categoryAvailable}
        revealLabel="Show category"
        lockedLabel={`Category hint unlocks after guess ${CATEGORY_HINT_AFTER}`}
        onReveal={() => onReveal("category")}
      />
      {state.clue && <div className="hint-strip revealed">Clue: {state.clue}</div>}
    </>
  );
}

interface LastChanceOfferProps {
  onTake: () => void;
  onGiveUp: () => void;
}

/** Shown in place of the input after the last regular guess misses. */
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

interface HintStripProps {
  /** The revealed hint, or null while hidden. */
  text: string | null;
  available: boolean;
  revealLabel: string;
  lockedLabel: string;
  onReveal: () => void;
}

function HintStrip({ text, available, revealLabel, lockedLabel, onReveal }: HintStripProps) {
  if (text) {
    return <div className="hint-strip revealed">{text}</div>;
  }
  if (available) {
    return (
      <button type="button" className="hint-strip" onClick={onReveal}>
        {revealLabel}
      </button>
    );
  }
  return (
    <div className="hint-strip">
      <LockIcon />
      {lockedLabel}
    </div>
  );
}

interface GuessInputProps {
  firstLetter: string;
  /** Resolves true if the guess was accepted (clears the input), false to shake. */
  /** A guess is being checked: further submits are ignored. */
  busy: boolean;
  /** Resolves true if accepted (clears the input), false if rejected (shakes), null if ignored. */
  onSubmit: (guess: string) => Promise<boolean | null>;
}

const finePointer = () => window.matchMedia("(pointer: fine)").matches;

export function GuessInput({ firstLetter, busy, onSubmit }: GuessInputProps) {
  const [value, setValue] = useState("");
  const [shaking, setShaking] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!value.trim() || busy) return;
    const accepted = await onSubmit(value);
    if (accepted) setValue("");
    else if (accepted === false) setShaking(true);
  }

  return (
    <form
      className={`input-row ${shaking ? "shake" : ""}`}
      onSubmit={handleSubmit}
      onAnimationEnd={() => setShaking(false)}
    >
      <label htmlFor="guess" className="sr-only">
        Your guess, starting with {firstLetter.toUpperCase()}
      </label>
      <input
        id="guess"
        className="guess-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={`${firstLetter.toUpperCase()}…`}
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="go"
        maxLength={MAX_GUESS_LEN}
        // Opening the native keyboard on load would hide the board on phones.
        autoFocus={finePointer()}
      />
      {/* Not `disabled`: that would drop focus and close the phone keyboard. */}
      <button type="submit" className="button primary guess-button" aria-busy={busy}>
        {busy ? "…" : "Guess"}
      </button>
    </form>
  );
}
