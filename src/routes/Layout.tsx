import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Header } from "../components/Header";
import { HowToPlaySheet, StatsSheet } from "../components/Sheets";
import { useOnline } from "../hooks/useOnline";
import { useViewportHeight } from "../hooks/useViewportHeight";
import { applyTheme } from "../lib/theme";
import {
  hasSeenHelp,
  loadTheme,
  markHelpSeen,
  saveTheme,
  type ThemePreference,
} from "../lib/storage";

export function Layout() {
  useViewportHeight();
  const [sheet, setSheet] = useState<"help" | "stats" | null>(() =>
    hasSeenHelp() ? null : "help",
  );
  const [theme, setTheme] = useState<ThemePreference>(loadTheme);
  const online = useOnline();

  function changeTheme(next: ThemePreference) {
    setTheme(next);
    saveTheme(next);
    applyTheme(next);
  }

  return (
    <div className="app">
      <Header onHelp={() => setSheet("help")} onStats={() => setSheet("stats")} />
      <div role="status">
        {!online && (
          <p className="offline-banner">
            You&rsquo;re offline. Your game is saved; keep going when you&rsquo;re back.
          </p>
        )}
      </div>
      <Outlet />
      <HowToPlaySheet
        open={sheet === "help"}
        onClose={() => {
          markHelpSeen();
          setSheet(null);
        }}
      />
      <StatsSheet
        open={sheet === "stats"}
        onClose={() => setSheet(null)}
        theme={theme}
        onThemeChange={changeTheme}
      />
    </div>
  );
}
