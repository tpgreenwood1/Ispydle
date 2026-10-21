import type { ThemePreference } from "./storage";

export function applyTheme(theme: ThemePreference) {
  if (theme === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
}
