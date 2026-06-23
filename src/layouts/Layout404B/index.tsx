import { useCallback, useEffect, useRef, useState } from "react";
import "./Layout404B.css";
import { LEVELS } from "./levels";
import { solve, type Move } from "./solver";
import type { FallAnim, Grid } from "./types";
import Intro from "./Intro";

const COLS = 13;
const WAVE_STEP = 40;
const WAVE_DUR = 200;
const WAVE_TOTAL = (COLS - 1) * 2 * WAVE_STEP + WAVE_DUR; // max diag = (12+12)

function rotateRight(grid: Grid): Grid {
  const n = grid.length;
  return Array.from({ length: n }, (_, r) =>
    Array.from({ length: n }, (_, c) => grid[n - 1 - c][r]),
  );
}

function rotateLeft(grid: Grid): Grid {
  const n = grid.length;
  return Array.from({ length: n }, (_, r) =>
    Array.from({ length: n }, (_, c) => grid[c][n - 1 - r]),
  );
}

function applyGravity(grid: Grid): { grid: Grid; fall: FallAnim; won: boolean } {
  const n = grid.length;
  const next: Grid = grid.map((row) => [...row]);

  let pr = -1, pc = -1;
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      if (next[r][c] === "pion") { pr = r; pc = c; }

  if (pr === -1) return { grid: next, fall: null, won: false };

  next[pr][pc] = "empty";

  let target = pr;
  let won = false;
  for (let r = pr + 1; r < n; r++) {
    if (next[r][pc] === "wall") break;
    if (next[r][pc] === "hole") { target = r; won = true; break; }
    target = r;
  }

  next[target][pc] = "pion";
  const dist = target - pr;
  return { grid: next, fall: dist > 0 ? { row: pr, col: pc, dist } : null, won };
}

export default function Layout404B() {
  const [showIntro, setShowIntro] = useState(true);
  const [entryPhase, setEntryPhase] = useState(0);
  const [levelIndex, setLevelIndex] = useState(0);
  const [grid, setGrid] = useState<Grid>(() => LEVELS[0].grid);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const [rotating, setRotating] = useState<"left" | "right" | null>(null);
  const [fallAnim, setFallAnim] = useState<FallAnim>(null);
  const [solution, setSolution] = useState<Move[] | null>(null);
  const [playedMoves, setPlayedMoves] = useState<Move[]>([]);
  const controlsRef = useRef<HTMLDivElement>(null);
  const homeRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (showIntro) return;
    const t1 = setTimeout(() => setEntryPhase(1), 100);
    const t2 = setTimeout(() => setEntryPhase(2), 100 + WAVE_TOTAL + 200);
    const t3 = setTimeout(() => setEntryPhase(3), 100 + WAVE_TOTAL + 200 + WAVE_TOTAL + 200);
    const t4 = setTimeout(() => setEntryPhase(4), 100 + WAVE_TOTAL + 200 + WAVE_TOTAL + 200 + WAVE_TOTAL + 200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [showIntro]);

  useEffect(() => {
    const controls = controlsRef.current;
    const home = homeRef.current;
    if (!controls || !home) return;

    const btns = Array.from(controls.querySelectorAll<HTMLElement>(".lb-btn"));
    const restartBtn = controls.querySelector<HTMLElement>(".lb-btn--restart");
    const allSecondary = [restartBtn, home].filter(Boolean) as HTMLElement[];

    if (entryPhase === 2) {
      [...btns, home].forEach((el, i) => {
        el.classList.remove("btn-wave-in", "btn-wave-out");
        void el.offsetWidth;
        el.style.setProperty("--btn-delay", `${i * 80}ms`);
        el.classList.add("btn-wave-out");
      });
    }

    if (entryPhase === 3) {
      allSecondary.forEach((el, i) => {
        el.classList.remove("btn-wave-in", "btn-wave-out");
        void el.offsetWidth;
        el.style.setProperty("--btn-delay", `${i * 80}ms`);
        el.classList.add("btn-wave-in");
      });
    }
  }, [entryPhase]);

  const loadLevel = useCallback((index: number) => {
    setGrid(LEVELS[index].grid);
    setMoves(0);
    setWon(false);
    setSolution(null);
    setPlayedMoves([]);
    setLevelIndex(index);
  }, []);

  const showSolution = useCallback(() => {
    // restart the level so the displayed solution matches the initial state
    setGrid(LEVELS[levelIndex].grid);
    setMoves(0);
    setWon(false);
    setPlayedMoves([]);
    setSolution(solve(LEVELS[levelIndex].grid) ?? []);
  }, [levelIndex]);

  const rotate = useCallback(
    (dir: "left" | "right") => {
      if (won || rotating || fallAnim || entryPhase < 4) return;
      setRotating(dir);
      setTimeout(() => {
        setGrid((prev) => {
          const rotated = dir === "right" ? rotateRight(prev) : rotateLeft(prev);
          const { grid: afterGravity, fall, won: didWin } = applyGravity(rotated);
          if (fall) {
            const intermediate = rotated.map((row) => [...row]);
            setFallAnim(fall);
            setTimeout(() => {
              setFallAnim(null);
              setGrid(afterGravity);
              if (didWin) setWon(true);
            }, 200);
            return intermediate;
          }
          if (didWin) setWon(true);
          return afterGravity;
        });
        setMoves((m) => m + 1);
        setPlayedMoves((prev) => [...prev, dir]);
        setRotating(null);
      }, 350);
    },
    [won, rotating, fallAnim, entryPhase],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") rotate("left");
      if (e.key === "ArrowRight") rotate("right");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [rotate]);

  const par = LEVELS[levelIndex].par;
  const isPerfect = moves <= par;

  // how many leading moves match the optimal solution = filled arrows
  let solvedCount = 0;
  if (solution) {
    while (
      solvedCount < playedMoves.length &&
      solvedCount < solution.length &&
      playedMoves[solvedCount] === solution[solvedCount]
    ) {
      solvedCount++;
    }
  }

  if (showIntro) return <Intro onDone={() => setShowIntro(false)} />;

  return (
    <div className="layout-b">
      <div className="lb-canvas-outer">
        <span className="lb-moves" style={{ opacity: entryPhase >= 4 ? 1 : 0 }}>
          Moves: {moves}
        </span>
        <div className={`lb-canvas-container${won ? " lb-canvas-container--won" : ""}`}>
          <div className={`lb-canvas-wrap ${rotating ? `rotating-${rotating}` : ""}`}>
            <div className={`lb-grid ${entryPhase === 0 ? "lb-grid--hidden" : ""}`}>
              {grid.map((row, r) =>
                row.map((cell, c) => {
                  const isFalling = fallAnim && cell === "pion" && r === fallAnim.row && c === fallAnim.col;
                  const diag = r + c;
                  const style: Record<string, string | number> = {
                    "--entry-delay": `${diag * WAVE_STEP}ms`,
                    "--wave-dur": `${WAVE_DUR}ms`,
                  };
                  if (isFalling) style["--fall-dist"] = fallAnim.dist;
                  if (won) style["--delay"] = `${diag * 30}ms`;

                  let cellClass = `lb-cell`;
                  if (entryPhase === 1) {
                    cellClass += " lb-cell--entry-black";
                  } else if (entryPhase === 2) {
                    // vague révélation : walls restent noires, les autres révèlent
                    if (cell === "wall") cellClass += " lb-cell--wall";
                    else cellClass += " lb-cell--entry-reveal";
                    if (cell !== "empty" && cell !== "wall") cellClass += ` lb-cell--${cell}`;
                  } else if (entryPhase >= 3) {
                    if (cell !== "empty") cellClass += ` lb-cell--${cell}`;
                  }
                  if (isFalling) cellClass += " lb-cell--falling";
                  if (won) cellClass += " lb-cell--win";

                  return (
                    <div
                      key={`${r}-${c}`}
                      className={cellClass}
                      style={style}
                    />
                  );
                }),
              )}
            </div>
          </div>

          {won && (
            <div className="lb-overlay">
              <span className="lb-overlay-title">Level complete</span>
              <span className="lb-overlay-score">
                Your score: {moves} move{moves !== 1 ? "s" : ""}
              </span>
              <span className="lb-overlay-par">
                {isPerfect ? "Perfect score" : `A better score is possible (par: ${par})`}
              </span>
              {levelIndex + 1 < LEVELS.length && (
                <button className="lb-btn lb-btn--next" onClick={() => loadLevel(levelIndex + 1)}>
                  Next level →
                </button>
              )}
            </div>
          )}
        </div>

        {solution && (
          <div className="lb-solution">
            {solution.length === 0 ? (
              <span className="lb-solution-empty">No solution.</span>
            ) : (
              <>
                <span className="lb-solution-label">Solution</span>
                <div className="lb-solution-arrows">
                  {solution.map((m, i) => (
                    <span
                      key={i}
                      className={`lb-solution-arrow${i < solvedCount ? " lb-solution-arrow--done" : ""}`}
                    >
                      {m === "left" ? "←" : "→"}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div
        className="lb-controls"
        ref={controlsRef}
        style={{ opacity: entryPhase >= 2 ? 1 : 0 }}
      >
        <button className="lb-btn lb-btn--rotate" onClick={() => rotate("left")}>
          ← LEFT
        </button>
        <button className="lb-btn lb-btn--restart" onClick={() => loadLevel(levelIndex)}>
          Restart
        </button>
        <button className="lb-btn lb-btn--restart" onClick={showSolution}>
          Solution
        </button>
        <button className="lb-btn lb-btn--rotate" onClick={() => rotate("right")}>
          RIGHT →
        </button>
      </div>

      <a
        className="lb-home"
        href="/"
        ref={homeRef}
        style={{ opacity: entryPhase >= 2 ? 1 : 0 }}
      >
        [Home]
      </a>
    </div>
  );
}
