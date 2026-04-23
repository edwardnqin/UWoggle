import { useMemo, useState } from "react";
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

function getModeCategory(record) {
  const mode = String(record?.mode || "").toLowerCase();
  if (mode.includes("timed") || record?.timerDuration) return "timed";
  return "unlimited";
}

function getWordsFoundCount(record) {
  if (Array.isArray(record?.foundWords)) return record.foundWords.length;
  return record?.wordCount ?? 0;
}

function getPlayedAtValue(record) {
  const raw = record?.playedAt;
  if (!raw) return 0;
  const timestamp = new Date(raw).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export default function History({ onBack, records, user, loading, error, onDeleteRecord, deletingRecordId }) {
  const [modeFilter, setModeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const filteredAndSortedRecords = useMemo(() => {
    const filtered = records.filter((record) => {
      if (modeFilter === "all") return true;
      return getModeCategory(record) === modeFilter;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "oldest") return getPlayedAtValue(a) - getPlayedAtValue(b);
      if (sortBy === "highestScore") return (b?.score ?? 0) - (a?.score ?? 0);
      if (sortBy === "mostWords") return getWordsFoundCount(b) - getWordsFoundCount(a);
      return getPlayedAtValue(b) - getPlayedAtValue(a);
    });

    return sorted;
  }, [records, modeFilter, sortBy]);

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
            <>
              <div className="historyControls">
                <label className="historyControl">
                  <span>Filter</span>
                  <select value={modeFilter} onChange={(event) => setModeFilter(event.target.value)}>
                    <option value="all">All</option>
                    <option value="unlimited">Unlimited</option>
                    <option value="timed">Timed</option>
                  </select>
                </label>

                <label className="historyControl">
                  <span>Sort</span>
                  <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="highestScore">Highest score</option>
                    <option value="mostWords">Most words found</option>
                  </select>
                </label>
              </div>

              <div className="historyResultsSummary">
                Showing {filteredAndSortedRecords.length} of {records.length} game{records.length === 1 ? "" : "s"}
              </div>

              {filteredAndSortedRecords.length === 0 ? (
                <ul className="hintList">
                  <li>No history records match the selected filter.</li>
                </ul>
              ) : (
                <div className="historyListScroll">
                  <div className="historyRecords">
                    {filteredAndSortedRecords.map((record) => (
                      <div key={record.id} className="historyRecordCard">
                        <div className="historyRecordHeader">
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
                        <div><strong>Words Found:</strong> {getWordsFoundCount(record)}</div>
                        <div><strong>Board:</strong> {formatBoard(record.board)}</div>
                        <div><strong>Words:</strong> {formatWords(record.foundWords)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
