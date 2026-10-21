/** Web Share where available, else the clipboard. Returns "copied" when the caller should toast. */
export async function shareText(text: string): Promise<"shared" | "copied" | "failed"> {
  if (navigator.share) {
    try {
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
