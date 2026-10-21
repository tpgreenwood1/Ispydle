import { CATEGORY_HINT_AFTER, LENGTH_REVEAL_AFTER, MAX_GUESSES } from "../../shared/config";
import type { GameState } from "../../shared/types";
import { loadStats, type ThemePreference } from "../lib/storage";
import { Sheet } from "./Sheet";

interface SheetBaseProps {
  open: boolean;
  onClose: () => void;
}

export function HowToPlaySheet({ open, onClose }: SheetBaseProps) {
  return (
    <Sheet open={open} onClose={onClose} title="How to play">
      <ol className="steps">
        <li>You see the first letter of a hidden word. You have {MAX_GUESSES} guesses.</li>
        <li>
          Guess any word starting with that letter. Letters that match from the start turn green.
        </li>
        <li>
          The length appears after guess {LENGTH_REVEAL_AFTER}; a category hint unlocks after guess{" "}
          {CATEGORY_HINT_AFTER}.
        </li>
      </ol>
      <div className="example" aria-hidden="true">
        <span className="example-label">Hidden word SANDAL, you guess SANDY:</span>
        <div className="grid">
          {"sandy".split("").map((letter, i) => (
            <span key={i} className={`tile ${i < 4 ? "confirmed" : "no-help"}`}>
              {letter}
            </span>
          ))}
        </div>
        <span className="example-label">…and SAND appears in the top row.</span>
      </div>
      <p className="sr-only">
        Example: if the hidden word is sandal and you guess sandy, S A N D are confirmed and SAND
        appears in the top row.
      </p>
      <button type="button" className="button primary" style={{ width: "100%" }} onClick={onClose}>
        Let&rsquo;s play
      </button>
    </Sheet>
  );
}

interface ResultSheetProps extends SheetBaseProps {
  state: GameState;
  onShare: () => void;
  onPlayAnother: () => void;
}

export function ResultSheet({ open, onClose, state, onShare, onPlayAnother }: ResultSheetProps) {
  const title =
    state.status === "won"
      ? `Spotted it! ${state.guessesUsed}/${MAX_GUESSES}`
      : `It was ${(state.answer ?? "").toUpperCase()}`;
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {state.category && <p className="muted">Category: {state.category}</p>}
      <div className="actions">
        <button type="button" className="button primary" onClick={onShare}>
          Share
        </button>
        <button type="button" className="button" onClick={onPlayAnother}>
          Play another word
        </button>
      </div>
    </Sheet>
  );
}

interface StatsSheetProps extends SheetBaseProps {
  theme: ThemePreference;
  onThemeChange: (theme: ThemePreference) => void;
}

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export function StatsSheet({ open, onClose, theme, onThemeChange }: StatsSheetProps) {
  const stats = loadStats();
  const totalWins = stats.wins.reduce((a, b) => a + b, 0);
  const winPct = stats.played ? Math.round((totalWins / stats.played) * 100) : 0;
  const maxWins = Math.max(1, ...stats.wins);

  return (
    <Sheet open={open} onClose={onClose} title="Statistics">
      <div className="stats-row">
        <div>
          <span className="stat-value">{stats.played}</span>
          <span className="stat-label">Played</span>
        </div>
        <div>
          <span className="stat-value">{winPct}%</span>
          <span className="stat-label">Win rate</span>
        </div>
      </div>

      <h3>Wins by guess</h3>
      <ol className="bars">
        {stats.wins.map((count, i) => (
          <li key={i} className="bar-row">
            <span className="bar-label">{i + 1}</span>
            <span
              className={`bar ${count ? "has-wins" : ""}`}
              style={{ width: `${(count / maxWins) * 100}%` }}
            >
              <span className="sr-only">
                {i + 1} {i === 0 ? "guess" : "guesses"}:{" "}
              </span>
              {count}
            </span>
          </li>
        ))}
      </ol>

      <h3 id="theme-label">Theme</h3>
      <div className="theme-options" role="radiogroup" aria-labelledby="theme-label">
        {THEMES.map(({ value, label }) => (
          <label key={value}>
            <input
              type="radio"
              name="theme"
              value={value}
              checked={theme === value}
              onChange={() => onThemeChange(value)}
            />
            {label}
          </label>
        ))}
      </div>
    </Sheet>
  );
}
