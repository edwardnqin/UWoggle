import HudButton from "../components/ui/HudButton";

function formatMode(record) {
  if (record?.mode) return record.mode;
  if (record?.timerDuration) return `Timed (${record.timerDuration} min)`;
  return "Unlimited";
}

function formatBoard(board) {
  if (!Array.isArray(board) || board.length === 0) return "No board recorded";
  return board.map((row) => row.join(" ")).join(" / ");
}

function formatWords(words) {
  if (!Array.isArray(words) || words.length === 0) return "None";
  return words.join(", ");
}

function formatResult(reason, timerDuration) {
  if (reason === "all_words_found") return "All words found";
  if (reason === "time_up") return "Time ran out";
  if (reason === "give_up") return timerDuration ? "Ended early" : "Ended by player";
  return "Game ended";
}

export default function History({ onBack, records, user, loading, error, onDeleteRecord, deletingRecordId }) {
  return (
    <div className="screen">
      <div className="topBar">
        <HudButton variant="miniGhost" onClick={onBack} ariaLabel="Go back">
          ← Back
        </HudButton>
      </div>

      <div className="centerStack">
        <div className="pageTitle">History</div>
        <div className="pageSubtitle">
          {user
            ? "Your saved games across sessions"
            : "You can browse history from this session as a guest. Sign in to keep it across sessions."}
        </div>

        <div className="hintCard historyPanel">
          <div className="hintTitle">Recent Games</div>

          {loading ? (
            <ul className="hintList">
              <li>Loading history...</li>
            </ul>
          ) : error ? (
            <ul className="hintList">
              <li>{error}</li>
            </ul>
          ) : records.length === 0 ? (
            <ul className="hintList">
              <li>No game history yet.</li>
              {!user ? <li>Play a game first, or log in to save history across sessions.</li> : null}
            </ul>
          ) : (
            <div className="historyListScroll">
              <div className="historyRecords">
                {records.map((record) => (
                  <div key={record.id} className="historyRecordCard">
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                      <div><strong>Played:</strong> {record.playedAt}</div>
                      {user ? (
                        <HudButton
                          variant="miniCancel"
                          onClick={() => {
                            const confirmed = window.confirm("Delete this history record?");
                            if (confirmed && onDeleteRecord) {
                              onDeleteRecord(record.id);
                            }
                          }}
                        >
                          {deletingRecordId === record.id ? "Deleting..." : "Delete"}
                        </HudButton>
                      ) : null}
                    </div>
                    <div><strong>Result:</strong> {formatResult(record.reason, record.timerDuration)}</div>
                    <div><strong>Mode:</strong> {formatMode(record)}</div>
                    <div><strong>Duration:</strong> {record.timerDuration ? `${record.timerDuration} min` : "Unlimited"}</div>
                    <div><strong>Score:</strong> {record.score ?? 0}</div>
                    <div><strong>Words Found:</strong> {record.foundWords?.length ?? record.wordCount ?? 0}</div>
                    <div><strong>Board:</strong> {formatBoard(record.board)}</div>
                    <div><strong>Words:</strong> {formatWords(record.foundWords)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
