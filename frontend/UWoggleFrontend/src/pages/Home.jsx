import React from "react";
import HudButton from "../components/ui/HudButton";
import WinsBadge from "../components/ui/WinsBadge";
import PlayIcon from "../components/ui/PlayIcon";
import logoPng from "../assets/UWoggle.png";

export default function Home({ onGo, onLogin, onSignup }) {
  return (
    <>
      <div className="topRow">
        <WinsBadge wins={0} className="animLeft delay1" />

        <div className="rightBtns animRight delay2">
          <HudButton variant="mini" onClick={onLogin} ariaLabel="Open login">
            Login
          </HudButton>
          <HudButton variant="mini" onClick={onSignup} ariaLabel="Open sign up">
            Sign Up
          </HudButton>
        </div>
      </div>

      <div className="brandBlock animTop delay2" aria-label="UWoggle brand">
        <img className="logoImg" src={logoPng} alt="UWoggle logo" />
      </div>

      <div className="actionsRow animBottom delay3">
        <HudButton onClick={() => onGo("history")} ariaLabel="Open history">
          History
        </HudButton>

        <HudButton className="playBtn" onClick={() => onGo("play")} ariaLabel="Play">
          <PlayIcon size={22} />
          Play
        </HudButton>

        <HudButton onClick={() => onGo("online")} ariaLabel="Open online">
          Online
        </HudButton>
      </div>
    </>
  );
}
