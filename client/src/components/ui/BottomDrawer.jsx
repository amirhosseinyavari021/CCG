// client/src/components/ui/BottomDrawer.jsx
import { useEffect } from "react";

export default function BottomDrawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  lang = "fa",
  primaryAction,
  secondaryAction,
}) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[80] transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        } bg-black/40`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-[90] transition-transform duration-200 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        dir={lang === "fa" ? "rtl" : "ltr"}
      >
        <div className="mx-auto w-full max-w-6xl px-4 pb-4">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] shadow-[var(--shadow)]">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[var(--text)]">{title}</div>
                {subtitle ? (
                  <div className="mt-1 text-xs text-[var(--muted)]">{subtitle}</div>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                {secondaryAction}
                {primaryAction}
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2 text-xs text-[var(--text)] hover:opacity-90"
                >
                  {lang === "fa" ? "بستن" : "Close"}
                </button>
              </div>
            </div>

            <div className="max-h-[70vh] overflow-auto px-4 py-4">
              {children}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
