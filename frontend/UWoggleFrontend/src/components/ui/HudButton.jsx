import React from "react";

export default function HudButton({ children, onClick, variant = "main", className = "", ariaLabel }) {
  return (
    <button
      type="button"
      className={`btn btn--${variant} ${className}`}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      <span className="btnInner">{children}</span>
    </button>
  );
}
