import { useEffect } from "react";

/**
 * Sizes the app to the visual viewport, so when the native keyboard opens the input row
 * sits just above it and only the guess history shrinks (iOS Safari doesn't resize dvh).
 */
export function useViewportHeight() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      document.documentElement.style.setProperty("--app-height", `${vv.height}px`);
      // iOS pans the page to the focused input; the layout already fits, so undo that.
      window.scrollTo(0, 0);
    };
    update();
    vv.addEventListener("resize", update);
    return () => vv.removeEventListener("resize", update);
  }, []);
}
