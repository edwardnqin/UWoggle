import React from "react";

export default function PlayIcon({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      style={{ display: "block" }}
    >
      <path d="M8.5 5.5v13l11-6.5-11-6.5z" />
    </svg>
  );
}
