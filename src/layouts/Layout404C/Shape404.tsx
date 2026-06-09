import { useMemo, useRef } from "react";
import { SHAPE_CARDS } from "./uno/cards";
import type { CapturedCard } from "./uno/cards";

// Chaque chiffre est une matrice 5×7 : 1 = une carte, 0 = vide.
const GLYPHS: Record<string, number[][]> = {
  "4": [
    [0, 0, 0, 1, 0],
    [0, 0, 1, 1, 0],
    [0, 1, 0, 1, 0],
    [1, 0, 0, 1, 0],
    [1, 1, 1, 1, 1],
    [0, 0, 0, 1, 0],
    [0, 0, 0, 1, 0],
  ],
  "0": [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
};

const WORD = "404";
const pick = () => SHAPE_CARDS[Math.floor(Math.random() * SHAPE_CARDS.length)];

export function Shape404({ onStart }: { onStart: (cards: CapturedCard[]) => void }) {
  // Une carte aléatoire par cellule pleine, figée au montage.
  const glyphs = useMemo(
    () =>
      WORD.split("").map((ch) =>
        GLYPHS[ch].map((row) => row.map((cell) => (cell ? pick() : null))),
      ),
    [],
  );
  const wrapRef = useRef<HTMLDivElement>(null);

  // Easter egg : cliquer une carte capture la position de toutes les cartes
  // (pour les regrouper ensuite) et lance la partie.
  function handleStart() {
    const wrap = wrapRef.current;
    if (!wrap) return onStart([]);
    const captured: CapturedCard[] = [];
    wrap.querySelectorAll<HTMLButtonElement>(".card-cell").forEach((node) => {
      const img = node.querySelector("img");
      const r = node.getBoundingClientRect();
      if (img) captured.push({ src: img.src, x: r.left, y: r.top, w: r.width, h: r.height });
    });
    onStart(captured);
  }

  return (
    <div className="layout-c">
      <div className="cards-404" ref={wrapRef} role="img" aria-label="404 — Page introuvable">
        {glyphs.map((glyph, gi) => (
          <div className="glyph" key={gi}>
            {glyph.map((row, ri) =>
              row.map((src, ci) =>
                src ? (
                  <button
                    type="button"
                    className="cell card-cell"
                    key={`${ri}-${ci}`}
                    onClick={handleStart}
                    aria-label="Carte"
                  >
                    <img className="uno" src={src} alt="" />
                  </button>
                ) : (
                  <div className="cell" key={`${ri}-${ci}`} />
                ),
              ),
            )}
          </div>
        ))}
      </div>

      <p className="message">Oups ! Cette page n'existe pas.</p>
      <a className="home" href="/">
        Retour à l'accueil
      </a>
    </div>
  );
}
