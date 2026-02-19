import React from "react";

export default function Modal({ title, open, onClose, children }) {
  if (!open) return null;

  return (
    <div className="modalOverlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modalCard">
        <div className="modalHeader">
          <div className="modalTitle">{title}</div>
          <button className="iconBtn" onClick={onClose} aria-label="Close modal" type="button">
            ✕
          </button>
        </div>
        <div className="modalBody">{children}</div>
      </div>
    </div>
  );
}
