import { useState } from "react";
import HudButton from "../components/ui/HudButton";
import PlayIcon from "../components/ui/PlayIcon";
import ProfileDropdown from "../components/ui/ProfileDropdown";
import logoPng from "../assets/UWoggle.png";

export default function Home({
  onGo,
  onOpenHistory,
  onOpenMultiplayer,
  onSetTimerDuration,
  onLogin,
  onSignup,
  onFeedback,
  onLogout,
  onEnterMultiplayerGame,
  user,
}) {
  const [singleplayerIsHovered, setSingleplayerIsHovered] = useState(false);
  const [timedModeIsHovered, setTimedModeIsHovered] = useState(false);

  return (
    <>
      <div className="topRow">
        <div className="leftBtns animLeft delay1">
          <HudButton variant="mini" onClick={onFeedback} ariaLabel="Open feedback">
            Feedback
          </HudButton>
        </div>

        <div className="rightBtns animRight delay2">
          {user ? (
            <ProfileDropdown
              user={user}
              onLogout={onLogout}
              onEnterMultiplayerGame={onEnterMultiplayerGame}
            />
          ) : (
            <>
              <HudButton variant="mini" onClick={onLogin} ariaLabel="Open login">
                Login
              </HudButton>
              <HudButton variant="mini" onClick={onSignup} ariaLabel="Open sign up">
                Sign Up
              </HudButton>
            </>
          )}
        </div>
      </div>

      <div className="brandBlock animTop delay2" aria-label="UWoggle brand">
        <img className="logoImg" src={logoPng} alt="UWoggle logo" />
      </div>

      <div className="actionsRow animBottom delay3">
        <HudButton onClick={onOpenHistory} ariaLabel="Open history">
          History
        </HudButton>

        <div
          className="btn"
          onMouseEnter={() => setSingleplayerIsHovered(true)}
          onMouseLeave={() => setSingleplayerIsHovered(false)}
        >
          <span className="btnInner">Singleplayer</span>
          {singleplayerIsHovered && (
            <div aria-label="Singleplayer modes">
              <HudButton variant="mini" onClick={() => onGo("unlimited")} ariaLabel="Play unlimited mode">
                Unlimited
              </HudButton>

              <div
                className="btn"
                onMouseEnter={() => setTimedModeIsHovered(true)}
                onMouseLeave={() => setTimedModeIsHovered(false)}
              >
                <span className="btnInner">Timed</span>
                {timedModeIsHovered && (
                  <div aria-label="Timed modes">
                    <HudButton
                      variant="mini"
                      onClick={() => {
                        onSetTimerDuration(5);
                        onGo("timed");
                      }}
                      ariaLabel="Play timed mode for 5 minutes"
                    >
                      5 mins.
                    </HudButton>
                    <HudButton
                      variant="mini"
                      onClick={() => {
                        onSetTimerDuration(10);
                        onGo("timed");
                      }}
                      ariaLabel="Play timed mode for 10 minutes"
                    >
                      10 mins.
                    </HudButton>
                    <HudButton
                      variant="mini"
                      onClick={() => {
                        onSetTimerDuration(15);
                        onGo("timed");
                      }}
                      ariaLabel="Play timed mode for 15 minutes"
                    >
                      15 mins.
                    </HudButton>
                    <HudButton
                      variant="mini"
                      onClick={() => {
                        onSetTimerDuration(20);
                        onGo("timed");
                      }}
                      ariaLabel="Play timed mode for 20 minutes"
                    >
                      20 mins.
                    </HudButton>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <HudButton onClick={onOpenMultiplayer} ariaLabel="Open online">
          <PlayIcon size={22} />
          Multiplayer
        </HudButton>
      </div>
    </>
  );
}
