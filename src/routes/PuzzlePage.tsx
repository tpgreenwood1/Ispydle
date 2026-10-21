import { useEffect, useState, type CSSProperties } from "react";
import { useParams } from "react-router-dom";
import { MAX_WORD_LEN } from "../../shared/config";
import { buildShareText } from "../../shared/share";
import { GuessHistory, LengthCaption, PrefixRow } from "../components/Board";
import { Counter, GuessInput, HintStrips } from "../components/Controls";
import { ResultSheet } from "../components/Sheets";
import { useToast } from "../components/toastContext";
import { useGame, type Hint } from "../hooks/useGame";
import { usePlayAnother } from "../hooks/usePlayAnother";
import { describeGuess, knownLetters } from "../lib/game";
import { shareText } from "../lib/share";
import { ErrorMessage, LoadingMessage, NotFoundMessage } from "./Messages";

const RESULT_DELAY_MS = 700;

export function PuzzlePage() {
  const { puzzleNo = "" } = useParams();
  if (!/^\d{1,9}$/.test(puzzleNo)) return <NotFoundMessage puzzleNo={puzzleNo} />;
  // Remount per puzzle so no state leaks between games.
  return <Game key={puzzleNo} puzzleNo={Number(puzzleNo)} />;
}

function Game({ puzzleNo }: { puzzleNo: number }) {
  const { phase, loadError, puzzle, state, busy, submit, revealHint, retry } = useGame(puzzleNo);
  const toast = useToast();
  const playAnother = usePlayAnother();
  const [announcement, setAnnouncement] = useState("");
  const [resultOpen, setResultOpen] = useState(false);
  const ended = state.status !== "playing";

  // Open the result once the game ends (or loads already finished), after the tiles settle.
  useEffect(() => {
    if (phase !== "ready" || !ended) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = setTimeout(() => setResultOpen(true), reduced ? 0 : RESULT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [phase, ended]);

  if (phase === "loading") return <LoadingMessage />;
  if (phase === "notFound") return <NotFoundMessage puzzleNo={String(puzzleNo)} />;
  if (phase === "error" || !puzzle) return <ErrorMessage message={loadError} onRetry={retry} />;

  const letters = knownLetters(state, puzzle.firstLetter);
  const prevLetters = knownLetters(
    { ...state, rows: state.rows.slice(0, -1), status: "playing" },
    puzzle.firstLetter,
  );
  // Long guesses widen the grid (shrinking tiles) so every row's columns still line up.
  const cols = Math.max(MAX_WORD_LEN, ...state.rows.map((r) => r.word.length));

  async function handleGuess(guess: string): Promise<boolean | null> {
    const result = await submit(guess);
    if (!result) return null;
    if (!result.ok) {
      toast(result.message);
      setAnnouncement(result.message);
      return false;
    }
    setAnnouncement(describeGuess(result.prev, result.next, puzzle?.firstLetter ?? ""));
    return true;
  }

  async function handleReveal(hint: Hint) {
    const failure = await revealHint(hint);
    if (failure) toast(failure);
  }

  async function handleShare() {
    const text = buildShareText(puzzleNo, state.rows, state.status, window.location.origin);
    const outcome = await shareText(text);
    if (outcome === "copied") toast("Copied");
    if (outcome === "failed") toast("Couldn't share");
  }

  return (
    <main className="game" style={{ "--cols": cols } as CSSProperties}>
      <p className="prompt">I spy with my little eye, something beginning with</p>
      <div aria-hidden="true">
        <PrefixRow
          letters={letters}
          prevLength={prevLetters.length}
          wordLength={state.wordLength}
        />
        <LengthCaption wordLength={state.wordLength} />
      </div>
      <p className="sr-only">
        Starts with {letters.toUpperCase().split("").join(" ")}
        {state.wordLength !== null && `, ${state.wordLength} letters`}.
      </p>
      <hr className="divider" />
      <GuessHistory rows={state.rows} wordLength={state.wordLength} />

      <div className="bottom">
        <Counter guessesUsed={state.guessesUsed} puzzleNo={puzzleNo} />
        <HintStrips state={state} onReveal={handleReveal} />
        {ended ? (
          <div className="actions">
            <button type="button" className="button" onClick={() => setResultOpen(true)}>
              See result
            </button>
            <button type="button" className="button primary" onClick={playAnother}>
              Play another word
            </button>
          </div>
        ) : (
          <GuessInput firstLetter={puzzle.firstLetter} busy={busy} onSubmit={handleGuess} />
        )}
      </div>

      <div className="sr-only" aria-live="polite">
        {announcement}
      </div>
      <ResultSheet
        open={resultOpen}
        onClose={() => setResultOpen(false)}
        state={state}
        onShare={handleShare}
        onPlayAnother={playAnother}
      />
    </main>
  );
}
