/**
 * Web Share with text only (no image attachment), else the clipboard.
 * Returns "copied" when the caller should toast.
 */
export async function shareResult(text: string): Promise<"shared" | "copied" | "failed"> {
  if (navigator.share) {
    try {
      // The link is already the text's last line; passing `url` too would repeat it on some platforms.
      await navigator.share({ text });
      return "shared";
    } catch (err) {
      if ((err as Error).name === "AbortError") return "shared";
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}

/** Counts the Share tap; nothing else is sent. */
export const countShareClick = () => navigator.sendBeacon?.("/api/share-clicked");
