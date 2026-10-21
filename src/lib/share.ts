const IMAGE_TIMEOUT_MS = 3_000;

/** The share image as a file, or null if it fails or takes too long (sharing then goes text-only). */
export async function fetchShareImage(path: string, fileName: string): Promise<File | null> {
  try {
    const res = await fetch(path, { signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS) });
    if (!res.ok) return null;
    return new File([await res.blob()], fileName, { type: "image/png" });
  } catch {
    return null;
  }
}

/**
 * Web Share, with the image when the platform takes files, else the clipboard.
 * Returns "copied" when the caller should toast. Never awaits the network, so the tap's
 * user gesture is still valid when navigator.share runs.
 */
export async function shareResult(
  text: string,
  image: File | null,
): Promise<"shared" | "copied" | "failed"> {
  if (navigator.share) {
    const files = image && navigator.canShare?.({ files: [image] }) ? [image] : null;
    try {
      // The link is already the text's last line; passing `url` too would repeat it on some platforms.
      await navigator.share(files ? { files, text } : { text });
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
