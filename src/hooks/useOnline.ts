import { useEffect, useState } from "react";

export function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}

/** While `failed`, calls `retry` as soon as the connection comes back. */
export function useRetryWhenOnline(failed: boolean, retry: () => void) {
  useEffect(() => {
    if (!failed) return;
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [failed, retry]);
}
