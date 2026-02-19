import React from "react";

export default function WinsBadge({ wins = 0, className = "" }) {
  return (
    <div className={`winsBadge ${className}`} aria-label="Wins">
      Wins: <span>{wins}</span>
    </div>
  );
}
