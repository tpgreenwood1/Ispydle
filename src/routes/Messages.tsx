import { usePlayAnother } from "../hooks/usePlayAnother";

export function LoadingMessage() {
  return (
    <main className="game">
      <p className="message">Loading…</p>
    </main>
  );
}

interface ErrorMessageProps {
  message: string;
  onRetry: () => void;
}

/** Load failure. Callers also retry automatically when the connection comes back. */
export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <main className="game">
      <div className="message">
        <h2>Couldn&rsquo;t load the game</h2>
        <p>{message}</p>
        <p>Your progress is saved on this device.</p>
        <button type="button" className="button primary" onClick={onRetry}>
          Try again
        </button>
      </div>
    </main>
  );
}

export function NotFoundMessage({ puzzleNo }: { puzzleNo?: string }) {
  const playAnother = usePlayAnother();
  return (
    <main className="game">
      <div className="message">
        <h2>Nothing to spy here</h2>
        <p>{puzzleNo ? `We couldn't find word #${puzzleNo}.` : "We couldn't find that page."}</p>
        <button type="button" className="button primary" onClick={playAnother}>
          Play a random word
        </button>
      </div>
    </main>
  );
}
