import { useEffect } from "react";
import { createPortal } from "react-dom";

export default function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
}
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-[92vw] max-w-3xl max-h-[85vh] overflow-y-auto ccg-card p-5 sm:p-6">
        <div className="flex justify-between items-center mb-4 gap-3">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
          <button onClick={onClose} className="ccg-btn-ghost text-xl leading-none px-3" type="button">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
