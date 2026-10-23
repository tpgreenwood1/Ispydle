import { useEffect, useState, type CSSProperties } from "react";
import { useParams } from "react-router-dom";
import { LAST_CHANCE_GUESSES, MAX_GUESSES, MAX_WORD_LEN } from "../../shared/config";
import { buildShareText, shareImageAlt, shareImagePath, shareResultFor } from "../../shared/share";
import { GuessHistory, LengthCaption, PrefixRow } from "../components/Board";
import {
  CategoryHint,
  Counter,
  GuessInput,
  Keyboard,
  LastChanceOffer,
} from "../components/Controls";
import { ResultSheet } from "../components/Sheets";
import { useToast } from "../components/toastContext";
import { useGame, type Hint } from "../hooks/useGame";
import { usePlayAnother } from "../hooks/usePlayAnother";
import { describeGuess, knownLetters } from "../lib/game";
import { countShareClick, shareResult } from "../lib/share";
import { resolvedTheme } from "../lib/theme";
import { ErrorMessage, LoadingMessage, NotFoundMessage } from "./Messages";

const RESULT_DELAY_MS = 700;

export function PuzzlePage() {
  const { puzzleNo = "" } = useParams();
  if (!/^\d{1,9}$/.test(puzzleNo)) return <NotFoundMessage puzzleNo={puzzleNo} />;
  // Remount per puzzle so no state leaks between games.
  return <Game key={puzzleNo} puzzleNo={Number(puzzleNo)} />;
}

function Game({ puzzleNo }: { puzzleNo: number }) {
  const { phase, loadError, puzzle, state, busy, submit, revealHint, giveUp, retry } =
    useGame(puzzleNo);
  const toast = useToast();
  const playAnother = usePlayAnother();
  const [announcement, setAnnouncement] = useState("");
  const [resultOpen, setResultOpen] = useState(false);
  const ended = state.status !== "playing";
  // During play the clue is only shown once the last chance is taken.
  const lastChanceOffered = !ended && state.clueAvailable && !state.clue;
  const lastChanceTaken = state.guessesUsed > MAX_GUESSES || (!ended && state.clue !== null);

  const result =
    state.status === "playing" ? null : shareResultFor(state.status, state.guessesUsed);
  const image =
    puzzle && result
      ? {
          path: shareImagePath({
            puzzleNo,
            firstLetter: puzzle.firstLetter,
            result,
            fmt: "card",
            theme: resolvedTheme(),
          }),
          alt: shareImageAlt(puzzleNo, puzzle.firstLetter, result),
          fileName: `ispydle-${puzzleNo}.png`,
        }
      : null;

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

  async function handleGiveUp() {
    const failure = await giveUp();
    if (failure) toast(failure);
  }

  async function handleShare() {
    if (!puzzle || state.status === "playing") return;
    countShareClick();
    const text = buildShareText({
      puzzleNo,
      firstLetter: puzzle.firstLetter,
      status: state.status,
      guessesUsed: state.guessesUsed,
      maxGuesses: MAX_GUESSES,
      baseUrl: window.location.origin,
      withResultParam: true,
    });
    const outcome = await shareResult(text);
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
      </div>
      <p className="sr-only">
        Starts with {letters.toUpperCase().split("").join(" ")}
        {state.wordLength !== null && `, ${state.wordLength} letters`}.
      </p>
      <div className="caption">
        <LengthCaption wordLength={state.wordLength} />
        <CategoryHint state={state} onReveal={() => handleReveal("category")} />
      </div>
      {/* Shown once the last chance is taken (or the game ends). */}
      {state.clue && <p className="clue">Clue: {state.clue}</p>}
      <hr className="divider" />
      <GuessHistory
        rows={state.rows}
        wordLength={state.wordLength}
        slots={lastChanceTaken ? LAST_CHANCE_GUESSES : MAX_GUESSES}
      />

      <div className="bottom">
        <Counter
          guessesUsed={state.guessesUsed}
          puzzleNo={puzzleNo}
          lastChance={!ended && state.clueAvailable}
        />
        {ended ? (
          <div className="actions">
            <button type="button" className="button" onClick={() => setResultOpen(true)}>
              See result
            </button>
            <button type="button" className="button primary" onClick={playAnother}>
              Play another word
            </button>
          </div>
        ) : lastChanceOffered ? (
          <LastChanceOffer onTake={() => handleReveal("clue")} onGiveUp={handleGiveUp} />
        ) : (
          <GuessInput firstLetter={puzzle.firstLetter} busy={busy} onSubmit={handleGuess} />
        )}
        {/* GuessInput brings its own keyboard; otherwise keep one in place, disabled. */}
        {(ended || lastChanceOffered) && <Keyboard />}
      </div>

      <div className="sr-only" aria-live="polite">
        {announcement}
      </div>
      <ResultSheet
        open={resultOpen}
        onClose={() => setResultOpen(false)}
        state={state}
        image={image}
        onShare={handleShare}
        onPlayAnother={playAnother}
      />
    </main>
  );
}
