import type { ThemePreference } from "./storage";

export function applyTheme(theme: ThemePreference) {
  if (theme === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
}

/** The theme actually showing: the user's override, else the system setting. */
export function resolvedTheme(): "light" | "dark" {
  const override = document.documentElement.dataset.theme;
  if (override === "light" || override === "dark") return override;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
