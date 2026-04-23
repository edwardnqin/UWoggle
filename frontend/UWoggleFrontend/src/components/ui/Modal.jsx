import { useEffect } from "react";
import { createPortal } from "react-dom";

export default function Modal({ title, open, onClose, children }) {
  useEffect(() => {
    if (!open) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose?.();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const body =
    typeof document !== "undefined" && document.body ? document.body : null;
  if (!body) {
    return null;
  }

  return createPortal(
    <div className="modalOverlay" onClick={onClose} role="presentation">
      <div
        className="modalCard"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modalHeader">
          <div className="modalTitle">{title}</div>
          <button className="iconBtn" onClick={onClose} aria-label="Close modal" type="button">
            ✕
          </button>
        </div>
        <div className="modalBody">{children}</div>
      </div>
    </div>,
    body
  );
}
