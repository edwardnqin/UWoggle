import Grid from '../components/ui/Grid'
import HudButton from "../components/ui/HudButton";
import React from "react";

export default function Play({ title, subtitle, onBack }) {

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
  
          <Grid />
        </div>
      </div>
    );
}