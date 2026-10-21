import { useState, type FormEvent } from "react";
import { CATEGORY_HINT_AFTER, MAX_GUESSES, MAX_GUESS_LEN } from "../../shared/config";
import type { GameState } from "../../shared/types";
import { LockIcon } from "./Icons";

export function Counter({ guessesUsed, puzzleNo }: { guessesUsed: number; puzzleNo: number }) {
  const left = MAX_GUESSES - guessesUsed;
  return (
    <div className="counter">
      <div className="pips">
        {Array.from({ length: MAX_GUESSES }, (_, i) => (
          <span key={i} className={`pip ${i < guessesUsed ? "used" : ""}`} aria-hidden="true" />
        ))}
        <span className="pips-label">
          {left} {left === 1 ? "guess" : "guesses"} left
        </span>
      </div>
      <span>Word #{puzzleNo}</span>
    </div>
  );
}

interface CategoryStripProps {
  state: GameState;
  onReveal: () => void;
}

export function CategoryStrip({ state, onReveal }: CategoryStripProps) {
  if (state.category) {
    return <div className="hint-strip revealed">Category: {state.category}</div>;
  }
  if (state.categoryAvailable) {
    return (
      <button type="button" className="hint-strip" onClick={onReveal}>
        Show category
      </button>
    );
  }
  return (
    <div className="hint-strip">
      <LockIcon />
      Category hint unlocks after guess {CATEGORY_HINT_AFTER}
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
