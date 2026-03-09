import HudButton from "../components/ui/HudButton";

export default function EndScreen({ title, subtitle, onReturn }) {

    return (
        <div className="screen">
              <div className="topBar">
              </div>
        
              <div className="centerStack">
                <div className="pageTitle">{title}</div>
                <div className="pageSubtitle">{subtitle}</div>
        
                <div className="hintCard">
                  <div className="hintTitle">Placeholder stats</div>
                  <ul className="hintList">
                    <li>Replace this placeholder with your real stats.</li>
                    <li>Wire these to routes (React Router) if you want real URLs.</li>
                    <li>Connect to backend endpoints when ready.</li>
                  </ul>
                </div>
              </div>

            <HudButton
                className="btn--fit"
                ariaLabel="Go back to Home Screen"
                onClick={onReturn}
            >
                Return
            </HudButton>
        </div>
    );
}