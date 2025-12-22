// client/src/components/ui/Modal.jsx
import { useEffect } from "react";
import { createPortal } from "react-dom";

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  widthClass = "max-w-2xl",
}) {
  useEffect(() => {
    if (!open) return;

    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="ccg-modal__overlay" onMouseDown={() => onClose?.()}>
      <div
        className={`ccg-modal ${widthClass}`}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="ccg-modal__head">
          <div className="ccg-modal__titles">
            <div className="ccg-modal__title">{title}</div>
            {subtitle ? <div className="ccg-modal__subtitle">{subtitle}</div> : null}
          </div>

          <button className="ccg-btn" type="button" onClick={() => onClose?.()}>
            ✕
          </button>
        </div>

        <div className="ccg-modal__body">{children}</div>
      </div>
    </div>,
    document.body
  );
}
