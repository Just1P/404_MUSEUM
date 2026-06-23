import { useEffect, useRef } from "react";
import "./Intro.css";

const WAVE_STEP = 70;
const WAVE_DUR = 180;
const MAX_DIAG = 4;
const WAVE_TOTAL = MAX_DIAG * WAVE_STEP + WAVE_DUR;

const CELLS = [
  { r: 0, c: 0, cls: "top-left" },
  { r: 0, c: 1, cls: "arm-top" },
  { r: 0, c: 2, cls: "top-right" },
  { r: 1, c: 0, cls: "arm-left" },
  { r: 1, c: 1, cls: "center" },
  { r: 1, c: 2, cls: "arm-right" },
  { r: 2, c: 0, cls: "bot-left" },
  { r: 2, c: 1, cls: "arm-bot" },
  { r: 2, c: 2, cls: "bot-right" },
];

// bras finissent à 250+600=850ms, coins finissent à 850+600=1450ms, pause 100ms
const BUILD_DONE = 2050;

const PHASE_TIMINGS = [BUILD_DONE, WAVE_TOTAL, WAVE_TOTAL, WAVE_TOTAL];

export default function Intro({ onDone }: { onDone: () => void }) {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const setWaveClass = (cls: string) => {
      grid.querySelectorAll<HTMLElement>(".intro-cell").forEach((el) => {
        el.classList.remove("waving-out", "waving-in");
        if (cls) el.classList.add(cls);
      });
    };

    let delay = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const phases = ["waving-out", "waving-in", "waving-out", "done"];

    phases.forEach((cls, i) => {
      delay += PHASE_TIMINGS[i];
      const t = setTimeout(() => {
        if (cls === "done") {
          onDone();
        } else {
          setWaveClass(cls);
        }
      }, delay);
      timers.push(t);
    });

    return () => timers.forEach(clearTimeout);
  }, [onDone]);

  return (
    <div className="intro">
      <div className="intro-grid" ref={gridRef}>
        {CELLS.map(({ r, c, cls }) => (
          <div
            key={cls}
            className={`intro-cell intro-cell--${cls}`}
            style={
              {
                "--r": r,
                "--c": c,
                "--wave-delay": `${(r + c) * WAVE_STEP}ms`,
                "--wave-dur": `${WAVE_DUR}ms`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}
