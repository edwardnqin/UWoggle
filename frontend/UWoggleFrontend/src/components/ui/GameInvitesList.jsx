/**
 * Pending game invites from friends (Flask) — guest joins via game service, then acknowledges.
 */
export default function GameInvitesList({
  invites,
  loading,
  busyInviteId,
  onAccept,
  onDecline,
}) {
  if (loading) {
    return <p className="friendSidebar__muted">Loading…</p>;
  }

  if (invites.length === 0) {
    return <p className="friendSidebar__muted">No game invites. Friends can send you one from the Friends tab.</p>;
  }

  return (
    <ul className="friendSidebar__requestList">
      {invites.map((inv) => (
        <li key={inv.invite_id} className="friendSidebar__requestRow">
          <div>
            <span className="friendSidebar__listName">{inv.host_username}</span>
            <span className="friendSidebar__requestMeta"> invited you to a game</span>
            {inv.created_at && (
              <div className="friendSidebar__requestMeta" style={{ marginTop: 4 }}>
                {inv.created_at}
              </div>
            )}
          </div>
          <div className="friendSidebar__requestActions">
            <button
              type="button"
              className="friendSidebar__btnInline friendSidebar__btnInline--accept"
              disabled={busyInviteId === inv.invite_id}
              onClick={() => onAccept(inv)}
            >
              {busyInviteId === inv.invite_id ? "…" : "Join game"}
            </button>
            <button
              type="button"
              className="friendSidebar__btnInline"
              disabled={busyInviteId === inv.invite_id}
              onClick={() => onDecline(inv.invite_id)}
            >
              Decline
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
