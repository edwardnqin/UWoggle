import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import "../../styles/grid.css";
import { getBoard } from "../../services/api";

function Grid({
  onCommitWord,
  onBoardReady,
  onSetMaxScore,
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

  const onBoardReadyRef = useRef(onBoardReady);
  const onSetMaxScoreRef = useRef(onSetMaxScore);
  const onCommitWordRef = useRef(onCommitWord);

  useEffect(() => {
    onBoardReadyRef.current = onBoardReady;
  }, [onBoardReady]);

  useEffect(() => {
    onSetMaxScoreRef.current = onSetMaxScore;
  }, [onSetMaxScore]);

  useEffect(() => {
    onCommitWordRef.current = onCommitWord;
  }, [onCommitWord]);

  useEffect(() => {
    submittedWordsRef.current = new Set(
      (alreadyFoundWords ?? []).map((word) => String(word).toUpperCase())
    );
  }, [alreadyFoundWords]);

  const boardRef = useRef(null);
  const cellRefs = useRef([]);

  const [path, setPath] = useState([]);
  const pathRef = useRef([]);

  const [mode, setMode] = useState(null);
  const modeRef = useRef(null);

  const pointerDownRef = useRef(false);
  const dragStartedRef = useRef(false);
  const startCellRef = useRef(null);
  const lastHoverRef = useRef(null);

  const [pointerPos, setPointerPos] = useState(null);
  const pointerPosRef = useRef(null);
  const rafRef = useRef(null);

  const [trailPoints, setTrailPoints] = useState([]);
  const [resultFlash, setResultFlash] = useState(null);
  const feedbackTimeoutRef = useRef(null);

  const setPathBoth = useCallback((next) => {
    pathRef.current = next;
    setPath(next);
  }, []);

  const setModeBoth = useCallback((nextMode) => {
    modeRef.current = nextMode;
    setMode(nextMode);
  }, []);

  const setPointerPosBoth = useCallback((nextPos) => {
    pointerPosRef.current = nextPos;
    setPointerPos(nextPos);
  }, []);

  const normalizedInitialWords = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(initialWords ?? {}).map(([word, points]) => [
          word.toUpperCase(),
          Number(points),
        ])
      ),
    [initialWords]
  );

  const effectiveGrid = skipFetch && initialBoard ? initialBoard : grid;
  const effectiveBoardWords =
    skipFetch && initialBoard ? normalizedInitialWords : boardWords;

  const effectiveStatus = useMemo(() => {
    if (skipFetch && initialBoard) return "Board ready.";
    if (effectiveGrid && status === "Loading board...") return "Board ready.";
    return status;
  }, [skipFetch, initialBoard, effectiveGrid, status]);

  const getPathWord = useCallback(
    (cells) => cells.map((cell) => cell.letter).join("").toUpperCase().trim(),
    []
  );

  const isAdjacent = useCallback((a, b) => {
    const dr = Math.abs(a.r - b.r);
    const dc = Math.abs(a.c - b.c);
    return dr <= 1 && dc <= 1 && !(dr === 0 && dc === 0);
  }, []);

  const makeCell = useCallback(
    (r, c) => ({
      r,
      c,
      letter: effectiveGrid[r][c],
    }),
    [effectiveGrid]
  );

  const prefixSet = useMemo(() => {
    const prefixes = new Set();

    Object.keys(effectiveBoardWords).forEach((word) => {
      const upper = word.toUpperCase();
      for (let i = 1; i <= upper.length; i += 1) {
        prefixes.add(upper.slice(0, i));
      }
    });

    return prefixes;
  }, [effectiveBoardWords]);

  const getSelectionState = useCallback(
    (word) => {
      if (!word) return "idle";
      if (effectiveBoardWords[word]) return "valid";
      if (prefixSet.has(word)) return "prefix";
      return "invalid";
    },
    [effectiveBoardWords, prefixSet]
  );

  const getCellCenter = useCallback((r, c) => {
    const boardElement = boardRef.current;
    const cellElement = cellRefs.current?.[r]?.[c];

    if (!boardElement || !cellElement) return null;

    const boardRect = boardElement.getBoundingClientRect();
    const cellRect = cellElement.getBoundingClientRect();

    return {
      x: cellRect.left + cellRect.width / 2 - boardRect.left,
      y: cellRect.top + cellRect.height / 2 - boardRect.top,
    };
  }, []);

  const getPathCenters = useCallback(
    (cells) => cells.map(({ r, c }) => getCellCenter(r, c)).filter(Boolean),
    [getCellCenter]
  );

  const clearFeedbackNow = useCallback(() => {
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }

    setResultFlash(null);
    setPathBoth([]);
    setModeBoth(null);
    setPointerPosBoth(null);
  }, [setModeBoth, setPathBoth, setPointerPosBoth]);

  const scheduleSelectionClear = useCallback(() => {
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }

    feedbackTimeoutRef.current = window.setTimeout(() => {
      setResultFlash(null);
      setPathBoth([]);
      setModeBoth(null);
      setPointerPosBoth(null);
      feedbackTimeoutRef.current = null;
    }, 525);
  }, [setModeBoth, setPathBoth, setPointerPosBoth]);

  const applyStep = useCallback(
    (r, c) => {
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
    },
    [isAdjacent, makeCell, setPathBoth]
  );

  const commit = useCallback(() => {
    const currentPath = [...pathRef.current];
    if (currentPath.length === 0) return;

    const word = getPathWord(currentPath);
    const lastCell = currentPath[currentPath.length - 1];
    const anchor =
      getCellCenter(lastCell.r, lastCell.c) ??
      pointerPosRef.current ?? { x: 0, y: 0 };

    setModeBoth(null);
    setPointerPosBoth(null);

    if (disabled) {
      setStatus("Waiting for game to start.");
      setResultFlash({
        type: "invalid",
        label: "Waiting...",
        anchor,
      });
      scheduleSelectionClear();
      return;
    }

    if (word.length < 3) {
      setStatus(`"${word}" is too short.`);
      setResultFlash({
        type: "invalid",
        label: `${word} ✕`,
        anchor,
      });
      scheduleSelectionClear();
      return;
    }

    if (submittedWordsRef.current.has(word)) {
      setStatus(`"${word}" was already found.`);
      setResultFlash({
        type: "duplicate",
        label: `${word} • already found`,
        anchor,
      });
      scheduleSelectionClear();
      return;
    }

    const points = effectiveBoardWords[word];
    if (!points) {
      setStatus(`"${word}" is not a valid word on this board.`);
      setResultFlash({
        type: "invalid",
        label: `${word} ✕`,
        anchor,
      });
      scheduleSelectionClear();
      return;
    }

    submittedWordsRef.current.add(word);

    setStatus(`Accepted: "${word}" (+${points})`);
    setResultFlash({
      type: "valid",
      label: `${word} ✓ +${points}`,
      anchor,
    });

    onCommitWordRef.current?.(word, points);
    scheduleSelectionClear();
  }, [
    disabled,
    effectiveBoardWords,
    getCellCenter,
    getPathWord,
    scheduleSelectionClear,
    setModeBoth,
    setPointerPosBoth,
  ]);

  const setCellRef = useCallback(
    (r, c) => (el) => {
      if (!cellRefs.current[r]) {
        cellRefs.current[r] = [];
      }
      cellRefs.current[r][c] = el;
    },
    []
  );

  useEffect(() => {
    let cancelled = false;

    if (skipFetch && initialBoard) {
      onBoardReadyRef.current?.({
        board: initialBoard,
        totalWords: Object.keys(normalizedInitialWords).length,
      });

      onSetMaxScoreRef.current?.(
        Object.values(normalizedInitialWords).reduce(
          (sum, points) => sum + Number(points),
          0
        )
      );

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

      onBoardReadyRef.current?.({
        board: res.data.board,
        totalWords: Object.keys(normalizedWords).length,
      });

      onSetMaxScoreRef.current?.(res.data.maxScore);
    });

    return () => {
      cancelled = true;
    };
  }, [initialBoard, normalizedInitialWords, skipFetch]);

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!effectiveGrid) return undefined;

    const handleMove = (e) => {
      if (!pointerDownRef.current) return;

      const rect = boardRef.current?.getBoundingClientRect();
      if (rect) {
        const nextPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        if (!rafRef.current) {
          rafRef.current = requestAnimationFrame(() => {
            setPointerPosBoth(nextPos);
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
      setPointerPosBoth(null);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [
    applyStep,
    commit,
    effectiveGrid,
    makeCell,
    setModeBoth,
    setPathBoth,
    setPointerPosBoth,
  ]);

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
  }, [commit]);

  useLayoutEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setTrailPoints(getPathCenters(path));
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [getPathCenters, path]);

  const onCellPointerDown = useCallback(
    (r, c) => (e) => {
      e.preventDefault();

      if (disabled) {
        setStatus("Waiting for game to start.");
        return;
      }

      if (feedbackTimeoutRef.current) {
        clearFeedbackNow();
      }

      pointerDownRef.current = true;
      dragStartedRef.current = false;
      startCellRef.current = { r, c };
      lastHoverRef.current = { r, c };

      const rect = boardRef.current?.getBoundingClientRect();
      if (rect) {
        setPointerPosBoth({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    },
    [clearFeedbackNow, disabled, setPointerPosBoth]
  );

  const word = getPathWord(path);
  const liveSelectionState = getSelectionState(word);
  const activeSelectionState = resultFlash?.type ?? liveSelectionState;

  const pathKeySet = useMemo(
    () => new Set(path.map((p) => `${p.r}:${p.c}`)),
    [path]
  );

  const effectivePoints =
    mode === "drag" && pointerPos && trailPoints.length > 0 && !resultFlash
      ? [...trailPoints, pointerPos]
      : trailPoints;

  const pointsAttr = effectivePoints.map((p) => `${p.x},${p.y}`).join(" ");

  const floatingAnchor =
    resultFlash?.anchor ??
    trailPoints[trailPoints.length - 1] ??
    pointerPos;

  const floatingLabel = resultFlash?.label ?? word;
  const showFloatingLabel = Boolean(floatingLabel && floatingAnchor);

  if (!effectiveGrid) {
    return (
      <div className="grid-background">
        <div className="wordPreview">{effectiveStatus}</div>
      </div>
    );
  }

  return (
    <div className="grid-background">
      <div className="wordPreview">
        Selected: <strong>{word || "—"}</strong>
        <br />
        <span>{effectiveStatus}</span>
      </div>

      <div className="boardWrap" ref={boardRef}>
        <svg className="trailSvg">
          {effectivePoints.length >= 2 && (
            <polyline
              className={`trailLine ${
                activeSelectionState !== "idle"
                  ? `trailLine--${activeSelectionState}`
                  : ""
              }`}
              points={pointsAttr}
            />
          )}
        </svg>

        {showFloatingLabel && (
          <div
            className={`floatingWord ${
              activeSelectionState !== "idle"
                ? `floatingWord--${activeSelectionState}`
                : ""
            }`}
            style={{
              left: `${floatingAnchor.x}px`,
              top: `${floatingAnchor.y}px`,
            }}
          >
            {floatingLabel}
          </div>
        )}

        <table className="gridTable">
          <tbody>
            {effectiveGrid.map((row, r) => (
              <tr key={r}>
                {row.map((letter, c) => {
                  const inPath = pathKeySet.has(`${r}:${c}`);

                  return (
                    <td key={`${r}-${c}`}>
                      <div
                        className={`circle ${
                          inPath
                            ? `selected ${
                                activeSelectionState !== "idle"
                                  ? `selected--${activeSelectionState}`
                                  : ""
                              }`
                            : ""
                        } ${disabled ? "disabled" : ""}`.trim()}
                        data-cell="true"
                        data-r={r}
                        data-c={c}
                        ref={setCellRef(r, c)}
                        onPointerDown={onCellPointerDown(r, c)}
                        role="button"
                        tabIndex={0}
                      >
                        {letter}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default React.memo(Grid);