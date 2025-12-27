// client/src/components/ui/Tooltip.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Tooltip Portaled:
 * - مشکل رفتن متن زیر باکس‌ها/overflow را حل می‌کند
 * - روی موبایل با click باز/بسته می‌شود
 */
export default function Tooltip({ text, side = "top" }) {
  const btnRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 280 });

  const bubbleStyle = useMemo(() => {
    return {
      position: "fixed",
      top: pos.top,
      left: pos.left,
      width: pos.width,
      zIndex: 99999,
    };
  }, [pos]);

  useEffect(() => {
    function onDoc(e) {
      if (!open) return;
      const b = btnRef.current;
      if (!b) return;
      if (b.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener("click", onDoc, true);
    return () => document.removeEventListener("click", onDoc, true);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const b = btnRef.current;
    if (!b) return;

    const r = b.getBoundingClientRect();
    const vw = Math.min(window.innerWidth, 520);
    const width = Math.min(320, vw - 24);

    let left = r.left + r.width / 2 - width / 2;
    left = Math.max(12, Math.min(left, window.innerWidth - width - 12));

    let top;
    if (side === "bottom") top = r.bottom + 10;
    else top = r.top - 10;

    // اگر بالا جا نبود → پایین
    if (top < 10) top = r.bottom + 10;
    // اگر پایین هم جا نبود → بالا
    if (top + 90 > window.innerHeight) top = Math.max(10, r.top - 100);

    setPos({ top, left, width });
  }, [open, side]);

  if (!text) return null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-5 h-5 rounded-full border text-xs text-slate-400 hover:bg-white/5 dark:border-white/10"
        aria-label="Help"
        title="Help"
      >
        ?
      </button>

      {open
        ? createPortal(
            <div style={bubbleStyle} dir="auto">
              <div className="rounded-xl border border-white/10 bg-slate-950/95 text-slate-100 shadow-2xl p-3 text-xs leading-6">
                {text}
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
document.body.classList.add("night-mode");
document.body.classList.add("day-mode");
