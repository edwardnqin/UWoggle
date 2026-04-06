import { useEffect, useState } from "react";

const CLOSE_ANIMATION_MS = 0;

export default function ProfileDropdown({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [activeView, setActiveView] = useState("friends");

  function closeSidebar() {
    setIsClosing(true);

    setTimeout(() => {
      setOpen(false);
      setIsClosing(false);
    }, CLOSE_ANIMATION_MS);
  }

  function openSidebar() {
    setIsClosing(false);
    setOpen(true);
  }

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        closeSidebar();
      }
    }

    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  

  

  const username = user?.username || user?.email || "User";
  const userId = user?.user_id ?? "—";

  function renderContent() {
    if (activeView === "friends") {
      return (
        <div className="friendSidebar__panel">
          <h3 className="friendSidebar__sectionTitle">Friends</h3>
          <p className="friendSidebar__placeholder">
            Friends list template goes here.
          </p>
        </div>
      );
    }

    if (activeView === "requests") {
      return (
        <div className="friendSidebar__panel">
          <h3 className="friendSidebar__sectionTitle">Friend Requests</h3>
          <p className="friendSidebar__placeholder">
            Friend requests template goes here.
          </p>
        </div>
      );
    }

    return (
      <div className="friendSidebar__panel">
        <h3 className="friendSidebar__sectionTitle">Game Invites</h3>
        <p className="friendSidebar__placeholder">
          Game invites template goes here.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="profileDropdown">
        <button
          type="button"
          className="profileDropdown__trigger"
          onClick={openSidebar}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label="Open profile sidebar"
        >
          <svg
            className="profileDropdown__icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
          </svg>
        </button>
      </div>

      {open && (
        <>
          <button
            type="button"
            className={`friendSidebar__backdrop ${isClosing ? "friendSidebar__backdrop--closing" : ""}`}
            aria-label="Close profile sidebar"
            onClick={closeSidebar}
          />

          <aside
            className={`friendSidebar ${isClosing ? "friendSidebar--closing" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="friendSidebarTitle"
          >
            <div className="friendSidebar__header">
              <div>
                <div id="friendSidebarTitle" className="friendSidebar__username">
                  {username}
                </div>
                <div className="friendSidebar__id">ID: {userId}</div>
              </div>

              <button
                type="button"
                className="friendSidebar__close"
                aria-label="Close sidebar"
                onClick={closeSidebar}
              >
                ×
              </button>
            </div>

            <div className="friendSidebar__tabs">
              <button
                type="button"
                className={`friendSidebar__tab ${activeView === "friends" ? "friendSidebar__tab--active" : ""}`}
                onClick={() => setActiveView("friends")}
              >
                Friends
              </button>

              <button
                type="button"
                className={`friendSidebar__tab ${activeView === "requests" ? "friendSidebar__tab--active" : ""}`}
                onClick={() => setActiveView("requests")}
              >
                Requests
              </button>

              <button
                type="button"
                className={`friendSidebar__tab ${activeView === "invites" ? "friendSidebar__tab--active" : ""}`}
                onClick={() => setActiveView("invites")}
              >
                Invites
              </button>
            </div>

            <div className="friendSidebar__content">{renderContent()}</div>

            <div className="friendSidebar__footer">
              <button
                type="button"
                className="friendSidebar__logout"
                onClick={() => {
                  onLogout();
                  closeSidebar();
                }}
              >
                Logout
              </button>
            </div>
          </aside>
        </>
      )}
    </>
  );
}