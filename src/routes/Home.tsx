import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRetryWhenOnline } from "../hooks/useOnline";
import { failureMessage, fetchRandom } from "../lib/api";
import { latestUnfinished, playedPuzzleNos } from "../lib/storage";
import { ErrorMessage, LoadingMessage } from "./Messages";

/** Resumes the latest unfinished game, otherwise starts a random one. */
export function Home() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => {
    setError(null);
    setAttempt((n) => n + 1);
  }, []);
  useRetryWhenOnline(error !== null, retry);

  useEffect(() => {
    const resume = latestUnfinished();
    if (resume !== null) {
      navigate(`/p/${resume}`, { replace: true });
      return;
    }
    let cancelled = false;
    fetchRandom(playedPuzzleNos())
      .then((p) => !cancelled && navigate(`/p/${p.puzzleNo}`, { replace: true }))
      .catch((err: unknown) => !cancelled && setError(failureMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [navigate, attempt]);

  if (error !== null) return <ErrorMessage message={error} onRetry={retry} />;
  return <LoadingMessage />;
}
