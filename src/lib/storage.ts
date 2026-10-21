import { MAX_GUESSES } from "../../shared/config";
import type { GameStatus } from "../../shared/types";

const KEYS = {
  games: "ispydle:v1:games",
  stats: "ispydle:v1:stats",
  theme: "ispydle:v1:theme",
  seenHelp: "ispydle:v1:seen-help",
};
const MAX_STORED_GAMES = 200;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the game still works, it just won't persist.
  }
}

// ---- Games ----

export interface StoredGame {
  guesses: string[];
  status: GameStatus;
  startedAt: number;
  categoryRevealed?: boolean;
  clueRevealed?: boolean;
}

type Games = Record<string, StoredGame>;

export const loadGames = (): Games => read<Games>(KEYS.games, {});

export const loadGame = (puzzleNo: number): StoredGame | undefined => loadGames()[puzzleNo];

export function saveGame(puzzleNo: number, game: StoredGame) {
  const games: Games = { ...loadGames(), [puzzleNo]: game };
  const latest = Object.entries(games)
    .sort(([, a], [, b]) => b.startedAt - a.startedAt)
    .slice(0, MAX_STORED_GAMES);
  write(KEYS.games, Object.fromEntries(latest));
}

export function removeGame(puzzleNo: number) {
  const rest = Object.entries(loadGames()).filter(([no]) => Number(no) !== puzzleNo);
  write(KEYS.games, Object.fromEntries(rest));
}

export function latestUnfinished(): number | null {
  const [latest] = Object.entries(loadGames())
    .filter(([, g]) => g.status === "playing")
    .sort(([, a], [, b]) => b.startedAt - a.startedAt);
  return latest ? Number(latest[0]) : null;
}

export const playedPuzzleNos = (): number[] => Object.keys(loadGames()).map(Number);

// ---- Stats ----

export interface Stats {
  played: number;
  /** wins[i] = games won in i + 1 guesses */
  wins: number[];
}

export const loadStats = (): Stats =>
  read<Stats>(KEYS.stats, { played: 0, wins: Array<number>(MAX_GUESSES).fill(0) });

export function recordResult(status: GameStatus, guessesUsed: number) {
  const stats = loadStats();
  stats.played++;
  if (status === "won") stats.wins[guessesUsed - 1] = (stats.wins[guessesUsed - 1] ?? 0) + 1;
  write(KEYS.stats, stats);
}

// ---- Preferences ----

export type ThemePreference = "system" | "light" | "dark";

export function loadTheme(): ThemePreference {
  const theme = read<string>(KEYS.theme, "system");
  return theme === "light" || theme === "dark" ? theme : "system";
}

export const saveTheme = (theme: ThemePreference) => write(KEYS.theme, theme);

export const hasSeenHelp = () => read(KEYS.seenHelp, false);

export const markHelpSeen = () => write(KEYS.seenHelp, true);
