/**
 * Profile avatar → sidebar: Friends (add by username, list), Requests (in/out + accept/decline),
 * Invites placeholder. Data from /api/friends/*; friends list loads when sidebar opens; incoming
 * request count polls for badge + stays fresh on focus/visibility.
 */
import { useCallback, useEffect, useState } from "react";

import {
  fetchFriends,
  fetchFriendRequests,
  sendFriendRequest,
  respondToFriendRequest,
  removeFriend,
} from "../../services/api";

const CLOSE_ANIMATION_MS = 0;
const REQUEST_POLL_MS = 20_000;

export default function ProfileDropdown({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [activeView, setActiveView] = useState("friends");

  // Invite flow: POST /api/friends/request with current user's id + typed username.
  const [friendUsername, setFriendUsername] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addMessage, setAddMessage] = useState(null);

  const [friendsList, setFriendsList] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(false);

  const [requestsData, setRequestsData] = useState({ incoming: [], outgoing: [] });
  const [requestsLoading, setRequestsLoading] = useState(false);

  const [respondId, setRespondId] = useState(null);
  const [removingId, setRemovingId] = useState(null);

  const userId = user?.user_id;

  const loadFriends = useCallback(async () => {
    if (userId == null) return;
    setFriendsLoading(true);
    try {
      const { ok, data } = await fetchFriends(userId);
      if (ok && Array.isArray(data)) {
        setFriendsList(data);
      } else {
        setFriendsList([]);
      }
    } catch {
      setFriendsList([]);
    } finally {
      setFriendsLoading(false);
    }
  }, [userId]);

  const loadRequests = useCallback(async () => {
    if (userId == null) return;
    setRequestsLoading(true);
    try {
      const { ok, data } = await fetchFriendRequests(userId);
      if (ok && data && typeof data === "object") {
        setRequestsData({
          incoming: Array.isArray(data.incoming) ? data.incoming : [],
          outgoing: Array.isArray(data.outgoing) ? data.outgoing : [],
        });
      } else {
        setRequestsData({ incoming: [], outgoing: [] });
      }
    } catch {
      setRequestsData({ incoming: [], outgoing: [] });
    } finally {
      setRequestsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!open || userId == null) return;
    loadFriends();
  }, [open, userId, loadFriends]);

  useEffect(() => {
    if (userId == null) return undefined;

    void loadRequests();

    const intervalId = window.setInterval(() => {
      if (document.hidden) return;
      void loadRequests();
    }, REQUEST_POLL_MS);

    function onVisible() {
      if (document.visibilityState === "visible") {
        void loadRequests();
      }
    }

    function onWindowFocus() {
      void loadRequests();
    }

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onWindowFocus);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onWindowFocus);
    };
  }, [userId, loadRequests]);

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

  async function handleAddFriend(e) {
    e.preventDefault();
    setAddMessage(null);
    const name = friendUsername.trim();
    if (!name) {
      setAddMessage({ type: "error", text: "Enter a username." });
      return;
    }
    if (userId == null) return;

    setAddLoading(true);
    try {
      const { ok, data } = await sendFriendRequest(userId, name);
      if (ok) {
        setAddMessage({ type: "success", text: data.message || "Friend request sent." });
        setFriendUsername("");
        await loadRequests();
      } else {
        setAddMessage({ type: "error", text: data.error || "Could not send request." });
      }
    } catch {
      setAddMessage({ type: "error", text: "Could not reach the server." });
    } finally {
      setAddLoading(false);
    }
  }

  async function handleRespond(requestId, action) {
    setRespondId(requestId);
    try {
      const { ok, data } = await respondToFriendRequest(requestId, action);
      if (ok) {
        await loadRequests();
        await loadFriends();
      } else {
        setAddMessage({ type: "error", text: data?.error || "Could not update request." });
      }
    } catch {
      setAddMessage({ type: "error", text: "Could not reach the server." });
    } finally {
      setRespondId(null);
    }
  }

  async function handleRemoveFriend(friendUserId) {
    setRemovingId(friendUserId);
    setAddMessage(null);
    try {
      const { ok, data } = await removeFriend(friendUserId);
      if (ok) {
        setAddMessage({ type: "success", text: data.message || "Friend removed." });
        await loadFriends();
      } else {
        setAddMessage({
          type: "error",
          text: data?.error || "Could not remove friend.",
        });
      }
    } catch {
      setAddMessage({ type: "error", text: "Could not reach the server." });
    } finally {
      setRemovingId(null);
    }
  }

  const username = user?.username || user?.email || "User";
  const displayUserId = userId ?? "—";

  const incomingCount = requestsData.incoming.length;
  const incomingBadgeText = incomingCount > 99 ? "99+" : String(incomingCount);

  function renderContent() {
    if (activeView === "friends") {
      return (
        <div className="friendSidebar__panel">
          <h3 className="friendSidebar__sectionTitle">Add a friend</h3>
          <p className="friendSidebar__hint">
            Enter their UWoggle username. They will see the request under the Requests tab.
          </p>
          <form className="friendSidebar__form" onSubmit={handleAddFriend}>
            <label className="friendSidebar__label" htmlFor="friendUsernameInput">
              Username
            </label>
            <input
              id="friendUsernameInput"
              className="friendSidebar__input"
              type="text"
              autoComplete="username"
              maxLength={30}
              placeholder="Their username"
              value={friendUsername}
              onChange={(e) => setFriendUsername(e.target.value)}
              disabled={addLoading}
            />
            <button
              type="submit"
              className="friendSidebar__btnPrimary"
              disabled={addLoading || userId == null}
            >
              {addLoading ? "Sending…" : "Add friend"}
            </button>
          </form>

          <h3 className="friendSidebar__sectionTitle friendSidebar__sectionTitle--spaced">Friends</h3>
          {friendsLoading ? (
            <p className="friendSidebar__muted">Loading…</p>
          ) : friendsList.length === 0 ? (
            <p className="friendSidebar__muted">No friends yet.</p>
          ) : (
            <ul className="friendSidebar__list">
              {friendsList.map((f) => (
                <li key={f.user_id} className="friendSidebar__listItem">
                  <div className="friendSidebar__friendRowLeft">
                    <span className="friendSidebar__listName">{f.username}</span>
                    {f.is_online ? (
                      <span className="friendSidebar__badge friendSidebar__badge--online">Online</span>
                    ) : (
                      <span className="friendSidebar__badge">Offline</span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="friendSidebar__btnRemove"
                    disabled={removingId === f.user_id || userId == null}
                    aria-label={`Remove ${f.username} from friends`}
                    onClick={() => handleRemoveFriend(f.user_id)}
                  >
                    {removingId === f.user_id ? "…" : "Remove"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    }

    if (activeView === "requests") {
      const { incoming, outgoing } = requestsData;
      return (
        <div className="friendSidebar__panel">
          <h3 className="friendSidebar__sectionTitle">Incoming</h3>
          {requestsLoading ? (
            <p className="friendSidebar__muted">Loading…</p>
          ) : incoming.length === 0 ? (
            <p className="friendSidebar__muted">No incoming requests.</p>
          ) : (
            <ul className="friendSidebar__requestList">
              {incoming.map((r) => (
                <li key={r.request_id} className="friendSidebar__requestRow">
                  <div>
                    <span className="friendSidebar__listName">{r.from_username}</span>
                    <span className="friendSidebar__requestMeta"> wants to be friends</span>
                  </div>
                  <div className="friendSidebar__requestActions">
                    <button
                      type="button"
                      className="friendSidebar__btnInline friendSidebar__btnInline--accept"
                      disabled={respondId === r.request_id}
                      onClick={() => handleRespond(r.request_id, "ACCEPT")}
                    >
                      {respondId === r.request_id ? "…" : "Accept"}
                    </button>
                    <button
                      type="button"
                      className="friendSidebar__btnInline"
                      disabled={respondId === r.request_id}
                      onClick={() => handleRespond(r.request_id, "DECLINE")}
                    >
                      Decline
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <h3 className="friendSidebar__sectionTitle friendSidebar__sectionTitle--spaced">Outgoing</h3>
          {requestsLoading ? (
            <p className="friendSidebar__muted">Loading…</p>
          ) : outgoing.length === 0 ? (
            <p className="friendSidebar__muted">No outgoing requests.</p>
          ) : (
            <ul className="friendSidebar__list">
              {outgoing.map((r) => (
                <li key={r.request_id} className="friendSidebar__listItem">
                  <span className="friendSidebar__listName">{r.to_username}</span>
                  <span className="friendSidebar__requestMeta"> pending</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    }

    return (
      <div className="friendSidebar__panel">
        <h3 className="friendSidebar__sectionTitle">Game Invites</h3>
        <p className="friendSidebar__placeholder">Game invites template goes here.</p>
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
          aria-label={
            incomingCount > 0
              ? `Open profile sidebar, ${incomingCount} pending friend request${incomingCount === 1 ? "" : "s"}`
              : "Open profile sidebar"
          }
        >
          <svg
            className="profileDropdown__icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
          </svg>
          {incomingCount > 0 && (
            <span className="profileDropdown__badge" aria-hidden>
              {incomingBadgeText}
            </span>
          )}
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
                <div className="friendSidebar__id">ID: {displayUserId}</div>
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
                className={`friendSidebar__tab friendSidebar__tab--row ${activeView === "requests" ? "friendSidebar__tab--active" : ""}`}
                onClick={() => setActiveView("requests")}
              >
                <span>Requests</span>
                {incomingCount > 0 && (
                  <span className="friendSidebar__tabBadge" aria-hidden>
                    {incomingBadgeText}
                  </span>
                )}
              </button>

              <button
                type="button"
                className={`friendSidebar__tab ${activeView === "invites" ? "friendSidebar__tab--active" : ""}`}
                onClick={() => setActiveView("invites")}
              >
                Invites
              </button>
            </div>

            {/* Success/error from add-friend or accept/decline (shared across tabs). */}
            {addMessage && (
              <p
                className={`friendSidebar__bannerMsg ${
                  addMessage.type === "error" ? "friendSidebar__inlineMsg--error" : "friendSidebar__inlineMsg--success"
                }`}
                role="status"
              >
                {addMessage.text}
              </p>
            )}

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
