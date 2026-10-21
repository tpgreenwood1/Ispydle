import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ToastContext } from "./toastContext";

const TOAST_MS = 1800;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const region = useRef<HTMLDivElement>(null);
  const show = useCallback((message: string) => setToast({ id: Date.now(), message }), []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  // Show the region as a popover so it sits in the top layer, above any open sheet.
  useEffect(() => {
    const el = region.current;
    if (!el || !("showPopover" in el)) return;
    el.setAttribute("popover", "manual");
    if (el.matches(":popover-open")) el.hidePopover();
    if (toast) el.showPopover();
  }, [toast]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div ref={region} className="toast-region" role="status">
        {toast && (
          <div key={toast.id} className="toast">
            {toast.message}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
