import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import "../../styles/grid.css";
import { getBoard } from "../../services/api";

export default function Grid({ onCommitWord, onBoardLoaded }) {
  const [grid, setGrid] = useState(null);
  const [boardWords, setBoardWords] = useState({});
  const [status, setStatus] = useState("Loading board...");

  // Track accepted words locally so duplicates are blocked immediately
  const submittedWordsRef = useRef(new Set());

  useEffect(() => {
    let cancelled = false;

    getBoard().then((res) => {
        if (cancelled) return;
      
        console.log("FULL BOARD RESPONSE:", res);
      
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
      
        const computedMaxScore =
          Number(res.data.maxScore) ||
          Object.values(normalizedWords).reduce((sum, pts) => sum + Number(pts || 0), 0);
      
        console.log("normalizedWords:", normalizedWords);
        console.log("computedMaxScore:", computedMaxScore);
      
        setGrid(res.data.board);
        setBoardWords(normalizedWords);
        submittedWordsRef.current = new Set();
      
        onBoardLoaded?.({ maxScore: computedMaxScore });
      
        setStatus("Board ready.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Wrap container (for outside-click detection + trail coordinate space)
  const boardRef = useRef(null);

  // Store element refs for measuring centers (sized when grid is set)
  const cellRefs = useRef([]);

  // Canonical path stored in a ref (avoids async setState ordering issues)
  const [path, setPath] = useState([]);
  const pathRef = useRef([]);
  const setPathBoth = (next) => {
    pathRef.current = next;
    setPath(next);
  };

  // mode: null | "click" | "drag"
  const [mode, setMode] = useState(null);
  const modeRef = useRef(null);
  const setModeBoth = (m) => {
    modeRef.current = m;
    setMode(m);
  };

  // pointer tracking
  const pointerDownRef = useRef(false);
  const dragStartedRef = useRef(false);
  const startCellRef = useRef(null); // {r,c}
  const lastHoverRef = useRef(null); // {r,c}

  // pointer position for “live” trail during drag
  const [pointerPos, setPointerPos] = useState(null); // {x,y} relative to boardWrap
  const rafRef = useRef(null);

  // computed points for the trail (centers of chosen cells)
  const [trailPoints, setTrailPoints] = useState([]); // [{x,y}, ...]

  const makeCell = (r, c) => ({ r, c, letter: grid[r][c] });

  const isAdjacent = (a, b) => {
    const dr = Math.abs(a.r - b.r);
    const dc = Math.abs(a.c - b.c);
    return dr <= 1 && dc <= 1 && !(dr === 0 && dc === 0);
  };

  // Add / backtrack step (works for both click + drag)
  const applyStep = (r, c) => {
    const current = pathRef.current;
    const nextCell = makeCell(r, c);

    if (current.length === 0) {
      setPathBoth([nextCell]);
      return;
    }

    const last = current[current.length - 1];
    if (!isAdjacent(last, nextCell)) return;

    // If revisiting a cell: backtrack
    const idx = current.findIndex((p) => p.r === r && p.c === c);
    if (idx !== -1) {
      // if it's the immediate previous cell => pop one
      if (current.length >= 2) {
        const prev = current[current.length - 2];
        if (prev.r === r && prev.c === c) {
          setPathBoth(current.slice(0, -1));
          return;
        }
      }
      // otherwise truncate to that earlier point
      setPathBoth(current.slice(0, idx + 1));
      return;
    }

    // Normal add
    setPathBoth([...current, nextCell]);
  };

  const commit = () => {
    const p = pathRef.current;
    if (p.length === 0) return;

    const w = p.map((x) => x.letter).join("").toUpperCase().trim();

    setPathBoth([]);
    setModeBoth(null);
    setPointerPos(null);

    if (w.length < 3) {
      setStatus(`"${w}" is too short.`);
      return;
    }

    if (submittedWordsRef.current.has(w)) {
      setStatus(`"${w}" was already found.`);
      return;
    }

    const points = boardWords[w];
    if (!points) {
      setStatus(`"${w}" is not a valid word on this board.`);
      return;
    }

    submittedWordsRef.current.add(w);
    setStatus(`Accepted: "${w}" (+${points})`);
    onCommitWord?.(w, points);
  };

  // Start tracking pointer down on a cell (do NOT auto-commit)
  const onCellPointerDown = (r, c) => (e) => {
    e.preventDefault();
    pointerDownRef.current = true;
    dragStartedRef.current = false;
    startCellRef.current = { r, c };
    lastHoverRef.current = { r, c };

    // initialize pointer pos for live trail
    const rect = boardRef.current?.getBoundingClientRect();
    if (rect) setPointerPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  // Global move/up listeners so dragging across cells is reliable
  useEffect(() => {
    if (!grid) return;

    const handleMove = (e) => {
      if (!pointerDownRef.current) return;

      // update live pointer position (throttled by rAF)
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

      // If we ever move to a different cell while pointer is down => drag mode
      if (!dragStartedRef.current && (r !== start.r || c !== start.c)) {
        dragStartedRef.current = true;
        setModeBoth("drag");
        // Drag starts a fresh word from the start cell
        setPathBoth([makeCell(start.r, start.c)]);
      }

      if (dragStartedRef.current) {
        applyStep(r, c);
      }
    };

    const handleUp = () => {
      if (!pointerDownRef.current) return;

      const start = startCellRef.current;

      // If we never moved off the start cell => treat as click-select step
      if (!dragStartedRef.current && start) {
        setModeBoth("click");
        applyStep(start.r, start.c);
      }

      // If we were dragging => commit on release
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid, boardWords]);

  // Click-outside to commit (only for click mode)
  useEffect(() => {
    const handleDocPointerDown = (e) => {
      if (modeRef.current !== "click") return;
      if (pathRef.current.length === 0) return;

      const board = boardRef.current;
      if (board && !board.contains(e.target)) {
        commit();
      }
    };

    document.addEventListener("pointerdown", handleDocPointerDown, true);
    return () => document.removeEventListener("pointerdown", handleDocPointerDown, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardWords]);

  // Compute trail points whenever path changes (measure centers)
  useLayoutEffect(() => {
    const board = boardRef.current;
    if (!board) return;

    const boardRect = board.getBoundingClientRect();

    const pts = path
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

    setTrailPoints(pts);
  }, [path]);

  if (!grid) {
    return (
      <div className="grid-background">
        <div className="wordPreview">{status}</div>
      </div>
    );
  }

  // Size cellRefs to match API board dimensions
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

  // Build SVG polyline string
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
                      className={`circle ${isInPath(r, c) ? "selected" : ""}`}
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