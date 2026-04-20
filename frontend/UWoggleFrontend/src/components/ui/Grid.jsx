import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import "../../styles/grid.css";
import { getBoard } from "../../services/api";

function Grid({
  onCommitWord,
  onBoardReady,
  initialBoard = null,
  initialWords = null,
  skipFetch = false,
  disabled = false,
  alreadyFoundWords = [],
}) {
  const [grid, setGrid] = useState(null);
  const [boardWords, setBoardWords] = useState({});
  const [status, setStatus] = useState("Loading board...");

  const submittedWordsRef = useRef(new Set());

  useEffect(() => {
    submittedWordsRef.current = new Set(
      (alreadyFoundWords ?? []).map((word) => String(word).toUpperCase())
    );
  }, [alreadyFoundWords]);

  useEffect(() => {
    let cancelled = false;

    if (skipFetch && initialBoard) {
      const normalizedWords = Object.fromEntries(
        Object.entries(initialWords ?? {}).map(([word, points]) => [
          word.toUpperCase(),
          Number(points),
        ])
      );

      setGrid(initialBoard);
      setBoardWords(normalizedWords);

      onBoardReady?.({
        board: initialBoard,
        totalWords: Object.keys(normalizedWords).length,
      });

      setStatus("Board ready.");
      return () => {
        cancelled = true;
      };
    }

    getBoard().then((res) => {
      if (cancelled) return;

      if (!res.ok || !res.data?.board) {
        setStatus("Failed to load board.");
        return;
      }

      const normalizedWords = Object.fromEntries(
        Object.entries(res.data.words ?? {}).map(([word, points]) => [
          word.toUpperCase(),
          Number(points),
        ])
      );

      setGrid(res.data.board);
      setBoardWords(normalizedWords);

      onBoardReady?.({
        board: res.data.board,
        totalWords: Object.keys(normalizedWords).length,
      });

      setStatus("Board ready.");
    });

    return () => {
      cancelled = true;
    };
  }, [onBoardReady, initialBoard, initialWords, skipFetch]);

  const boardRef = useRef(null);
  const cellRefs = useRef([]);

  const [path, setPath] = useState([]);
  const pathRef = useRef([]);
  const setPathBoth = (next) => {
    pathRef.current = next;
    setPath(next);
  };

  const [mode, setMode] = useState(null);
  const modeRef = useRef(null);
  const setModeBoth = (nextMode) => {
    modeRef.current = nextMode;
    setMode(nextMode);
  };

  const pointerDownRef = useRef(false);
  const dragStartedRef = useRef(false);
  const startCellRef = useRef(null);
  const lastHoverRef = useRef(null);

  const [pointerPos, setPointerPos] = useState(null);
  const rafRef = useRef(null);

  const [trailPoints, setTrailPoints] = useState([]);

  const makeCell = (r, c) => ({ r, c, letter: grid[r][c] });

  const isAdjacent = (a, b) => {
    const dr = Math.abs(a.r - b.r);
    const dc = Math.abs(a.c - b.c);
    return dr <= 1 && dc <= 1 && !(dr === 0 && dc === 0);
  };

  const applyStep = (r, c) => {
    const current = pathRef.current;
    const nextCell = makeCell(r, c);

    if (current.length === 0) {
      setPathBoth([nextCell]);
      return;
    }

    const last = current[current.length - 1];
    if (!isAdjacent(last, nextCell)) return;

    const idx = current.findIndex((p) => p.r === r && p.c === c);
    if (idx !== -1) {
      if (current.length >= 2) {
        const prev = current[current.length - 2];
        if (prev.r === r && prev.c === c) {
          setPathBoth(current.slice(0, -1));
          return;
        }
      }
      setPathBoth(current.slice(0, idx + 1));
      return;
    }

    setPathBoth([...current, nextCell]);
  };

  const commit = () => {
    const currentPath = pathRef.current;
    if (currentPath.length === 0) return;

    const word = currentPath
      .map((cell) => cell.letter)
      .join("")
      .toUpperCase()
      .trim();

    setPathBoth([]);
    setModeBoth(null);
    setPointerPos(null);

    if (disabled) {
      setStatus("Waiting for game to start.");
      return;
    }

    if (word.length < 3) {
      setStatus(`"${word}" is too short.`);
      return;
    }

    if (submittedWordsRef.current.has(word)) {
      setStatus(`"${word}" was already found.`);
      return;
    }

    const points = boardWords[word];
    if (!points) {
      setStatus(`"${word}" is not a valid word on this board.`);
      return;
    }

    submittedWordsRef.current.add(word);
    setStatus(`Accepted: "${word}" (+${points})`);
    onCommitWord?.(word, points);
  };

  const onCellPointerDown = (r, c) => (e) => {
    if (disabled) {
      setStatus("Waiting for game to start.");
      return;
    }

    e.preventDefault();
    pointerDownRef.current = true;
    dragStartedRef.current = false;
    startCellRef.current = { r, c };
    lastHoverRef.current = { r, c };

    const rect = boardRef.current?.getBoundingClientRect();
    if (rect) {
      setPointerPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  };

  useEffect(() => {
    if (!grid) return undefined;

    const handleMove = (e) => {
      if (!pointerDownRef.current) return;

      const rect = boardRef.current?.getBoundingClientRect();
      if (rect) {
        const nextPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        if (!rafRef.current) {
          rafRef.current = requestAnimationFrame(() => {
            setPointerPos(nextPos);
            rafRef.current = null;
          });
        }
      }

      const el = document.elementFromPoint(e.clientX, e.clientY);
      const cell = el?.closest?.('[data-cell="true"]');
      if (!cell) return;

      const r = Number(cell.dataset.r);
      const c = Number(cell.dataset.c);
      if (Number.isNaN(r) || Number.isNaN(c)) return;

      const lastHover = lastHoverRef.current;
      if (lastHover && lastHover.r === r && lastHover.c === c) return;
      lastHoverRef.current = { r, c };

      const start = startCellRef.current;
      if (!start) return;

      if (!dragStartedRef.current && (r !== start.r || c !== start.c)) {
        dragStartedRef.current = true;
        setModeBoth("drag");
        setPathBoth([makeCell(start.r, start.c)]);
      }

      if (dragStartedRef.current) {
        applyStep(r, c);
      }
    };

    const handleUp = () => {
      if (!pointerDownRef.current) return;

      const start = startCellRef.current;

      if (!dragStartedRef.current && start) {
        setModeBoth("click");
        applyStep(start.r, start.c);
      }

      if (dragStartedRef.current) {
        commit();
      }

      pointerDownRef.current = false;
      dragStartedRef.current = false;
      startCellRef.current = null;
      lastHoverRef.current = null;
      setPointerPos(null);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [grid, boardWords, disabled]);

  useEffect(() => {
    const handleDocPointerDown = (e) => {
      if (modeRef.current !== "click") return;
      if (pathRef.current.length === 0) return;

      const boardElement = boardRef.current;
      if (boardElement && !boardElement.contains(e.target)) {
        commit();
      }
    };

    document.addEventListener("pointerdown", handleDocPointerDown, true);
    return () => {
      document.removeEventListener("pointerdown", handleDocPointerDown, true);
    };
  }, [boardWords, disabled]);

  useLayoutEffect(() => {
    const boardElement = boardRef.current;
    if (!boardElement) return;

    const boardRect = boardElement.getBoundingClientRect();

    const points = path
      .map(({ r, c }) => {
        const el = cellRefs.current?.[r]?.[c];
        if (!el) return null;

        const rect = el.getBoundingClientRect();
        return {
          x: rect.left + rect.width / 2 - boardRect.left,
          y: rect.top + rect.height / 2 - boardRect.top,
        };
      })
      .filter(Boolean);

    setTrailPoints(points);
  }, [path]);

  if (!grid) {
    return (
      <div className="grid-background">
        <div className="wordPreview">{status}</div>
      </div>
    );
  }

  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  if (
    !cellRefs.current.length ||
    cellRefs.current.length !== rows ||
    cellRefs.current[0]?.length !== cols
  ) {
    cellRefs.current = grid.map((row) => row.map(() => null));
  }

  const word = path.map((p) => p.letter).join("");
  const isInPath = (r, c) => path.some((p) => p.r === r && p.c === c);

  const effectivePoints =
    mode === "drag" && pointerPos && trailPoints.length > 0
      ? [...trailPoints, pointerPos]
      : trailPoints;

  const pointsAttr = effectivePoints.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="grid-background">
      <div className="wordPreview">
        Selected: <strong>{word || "—"}</strong>
        <br />
        <span>{status}</span>
      </div>

      <div className="boardWrap" ref={boardRef}>
        <svg className="trailSvg">
          {effectivePoints.length >= 2 && (
            <polyline className="trailLine" points={pointsAttr} />
          )}
        </svg>

        <table className="gridTable">
          <tbody>
            {grid.map((row, r) => (
              <tr key={r}>
                {row.map((letter, c) => (
                  <td key={`${r}-${c}`}>
                    <div
                      className={`circle ${isInPath(r, c) ? "selected" : ""} ${disabled ? "disabled" : ""}`}
                      data-cell="true"
                      data-r={r}
                      data-c={c}
                      ref={(el) => {
                        cellRefs.current[r][c] = el;
                      }}
                      onPointerDown={onCellPointerDown(r, c)}
                      role="button"
                      tabIndex={0}
                    >
                      {letter}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default React.memo(Grid);