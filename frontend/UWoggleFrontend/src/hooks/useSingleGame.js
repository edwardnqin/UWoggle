import { useEffect, useState } from "react";
import { getBoard } from "../services/api";

export default function useSingleGame() {
  const [grid, setGrid] = useState(null);
  const [boardWords, setBoardWords] = useState({});
  const [maxScore, setMaxScore] = useState(0);

  const [foundWords, setFoundWords] = useState([]);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState("Loading board...");

  useEffect(() => {
    let cancelled = false;

    async function loadBoard() {
      const res = await getBoard();

      if (!res.ok || !res.data?.board) {
        if (!cancelled) setStatus("Failed to load board.");
        return;
      }

      const normalizedWords = Object.fromEntries(
        Object.entries(res.data.words ?? {}).map(([word, points]) => [
          word.toUpperCase(),
          points,
        ])
      );

      if (!cancelled) {
        setGrid(res.data.board);
        setBoardWords(normalizedWords);
        setMaxScore(res.data.maxScore ?? 0);
        setFoundWords([]);
        setScore(0);
        setStatus("Board ready.");
      }
    }

    loadBoard();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleCommitWord = (word) => {
    const w = word.toUpperCase().trim();

    if (!w) return;

    if (w.length < 3) {
      setStatus(`"${w}" is too short.`);
      return;
    }

    if (foundWords.includes(w)) {
      setStatus(`"${w}" was already found.`);
      return;
    }

    const points = boardWords[w];
    if (!points) {
      setStatus(`"${w}" is not a valid word on this board.`);
      return;
    }

    setFoundWords((prev) => [...prev, w]);
    setScore((prev) => prev + points);
    setStatus(`Accepted: "${w}" (+${points})`);
  };

  return {
    grid,
    foundWords,
    score,
    maxScore,
    status,
    handleCommitWord,
  };
}