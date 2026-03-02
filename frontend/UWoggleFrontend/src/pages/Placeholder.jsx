import React from "react";
import HudButton from "../components/ui/HudButton";

export default function Placeholder({ title, subtitle, onBack }) {
  return (
    <div className="screen">
      <div className="topBar">
        <HudButton variant="miniGhost" onClick={onBack} ariaLabel="Go back">
          ← Back
        </HudButton>
      </div>

      <div className="centerStack">
        <div className="pageTitle">{title}</div>
        <div className="pageSubtitle">{subtitle}</div>

        <div className="hintCard">
          <div className="hintTitle">Next steps</div>
          <ul className="hintList">
            <li>Replace this placeholder with your real UI.</li>
            <li>Wire these to routes (React Router) if you want real URLs.</li>
            <li>Connect to backend endpoints when ready.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
