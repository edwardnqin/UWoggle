import HudButton from "../components/ui/HudButton";
import PlayIcon from "../components/ui/PlayIcon";

export default function SingleModeSelect({ onBack, onGo, title, subtitle}) {

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

                <HudButton
                    onClick={() => onGo("unlimited")}
                    className="playBtn"
                    ariaLabel="Unlimited Mode"
                >
                    <PlayIcon size={22} />
                    Unlimited
                </HudButton>

                <HudButton 
                    onClick={() => onGo("timed")}
                    className="playBtn"
                    ariaLabel="Timer mode"
                >
                    <PlayIcon size={22} />
                    Timed
                </HudButton>
            </div>
        </div>
    );
}