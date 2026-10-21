import { useCallback, useEffect, useRef, useState } from "react";
import type { GameState, PuzzleInfo } from "../../shared/types";
import { HttpError, failureMessage, fetchPuzzle, postGuesses } from "../lib/api";
import { EMPTY_STATE, errorMessage } from "../lib/game";
import { loadGame, recordResult, removeGame, saveGame, type StoredGame } from "../lib/storage";
import { useRetryWhenOnline } from "./useOnline";

export type GamePhase = "loading" | "ready" | "notFound" | "error";

/** null: ignored (a guess is already being checked). */
export type SubmitResult =
  { ok: true; prev: GameState; next: GameState } | { ok: false; message: string } | null;

export type Hint = "category" | "clue";

/** The hints this device has already revealed, as request flags. */
const storedReveal = (stored: StoredGame | undefined) => ({
  revealCategory: stored?.categoryRevealed ?? false,
  revealClue: stored?.clueRevealed ?? false,
});

/**
 * Loads a puzzle and rebuilds its state from the guesses stored on this device
 * (the server re-evaluates them, so the answer is never stored mid-game).
 */
export function useGame(puzzleNo: number) {
  const [phase, setPhase] = useState<GamePhase>("loading");
  const [loadError, setLoadError] = useState("");
  const [puzzle, setPuzzle] = useState<PuzzleInfo | null>(null);
  const [state, setState] = useState<GameState>(EMPTY_STATE);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setPhase("loading");

    (async () => {
      const info = await fetchPuzzle(puzzleNo);
      const stored = loadGame(puzzleNo);
      let next = EMPTY_STATE;
      if (stored?.guesses.length) {
        try {
          const res = await postGuesses(puzzleNo, stored.guesses, storedReveal(stored));
          if (res.valid) next = res.state;
        } catch (err) {
          // 400: the stored history no longer validates (e.g. the word list changed). Start over.
          if (!(err instanceof HttpError && err.status === 400)) throw err;
        }
      }
      if (cancelled) return;
      saveGame(puzzleNo, {
        guesses: next.rows.map((r) => r.word),
        status: next.status,
        startedAt: stored?.startedAt ?? Date.now(),
        categoryRevealed: stored?.categoryRevealed,
        clueRevealed: stored?.clueRevealed,
      });
      setPuzzle(info);
      setState(next);
      setPhase("ready");
    })().catch((err: unknown) => {
      if (cancelled) return;
      const notFound = err instanceof HttpError && err.status === 404;
      // Forget a puzzle that was removed, so "/" doesn't keep resuming it.
      if (notFound) removeGame(puzzleNo);
      setLoadError(failureMessage(err));
      setPhase(notFound ? "notFound" : "error");
    });

    return () => {
      cancelled = true;
    };
  }, [puzzleNo, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  useRetryWhenOnline(phase === "error", retry);

  const submit = useCallback(
    async (raw: string): Promise<SubmitResult> => {
      const guess = raw.trim().toLowerCase();
      if (!guess || !puzzle || state.status !== "playing" || pending.current) return null;
      pending.current = true;
      setBusy(true);
      try {
        const stored = loadGame(puzzleNo);
        const guesses = [...state.rows.map((r) => r.word), guess];
        const res = await postGuesses(puzzleNo, guesses, storedReveal(stored));
        if (!res.valid) return { ok: false, message: errorMessage(res.error, puzzle.firstLetter) };

        saveGame(puzzleNo, {
          ...stored,
          guesses,
          status: res.state.status,
          startedAt: stored?.startedAt ?? Date.now(),
        });
        if (res.state.status !== "playing") recordResult(res.state.status, res.state.guessesUsed);
        setState(res.state);
        return { ok: true, prev: state, next: res.state };
      } catch (err) {
        // Nothing was saved, so the guess can simply be sent again.
        return { ok: false, message: failureMessage(err) };
      } finally {
        pending.current = false;
        setBusy(false);
      }
    },
    [puzzle, puzzleNo, state],
  );

  /** Returns an error message, or null on success. */
  const revealHint = useCallback(
    async (hint: Hint): Promise<string | null> => {
      const stored = loadGame(puzzleNo);
      const reveal = storedReveal(stored);
      if (hint === "category") reveal.revealCategory = true;
      else reveal.revealClue = true;
      try {
        const res = await postGuesses(
          puzzleNo,
          state.rows.map((r) => r.word),
          reveal,
        );
        if (!res.valid) return failureMessage(null);
        if (stored) {
          saveGame(puzzleNo, {
            ...stored,
            categoryRevealed: reveal.revealCategory,
            clueRevealed: reveal.revealClue,
          });
        }
        setState(res.state);
        return null;
      } catch (err) {
        return failureMessage(err);
      }
    },
    [puzzleNo, state.rows],
  );

  return { phase, loadError, puzzle, state, busy, submit, revealHint, retry };
}
