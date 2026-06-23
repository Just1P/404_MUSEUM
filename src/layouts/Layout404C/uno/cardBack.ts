// Dos de carte UNO généré en pixel-art (SVG data-URL), réutilisé comme image.

const PAL = {
  W: "#f3ead2", // crème (bord)
  K: "#191a1f", // presque noir (corps)
  R: "#d8312f", // rouge (ovale)
  D: "#9e1f1d", // rouge foncé (liseré de l'ovale)
  Y: "#ffd23f", // jaune (UNO)
} as const;
type Key = keyof typeof PAL;

const W = 46;
const H = 54;
const BORDER = 3;
const RC = 6;

// Point (px,py) dans un rectangle à coins arrondis.
function inRR(px: number, py: number, x0: number, y0: number, x1: number, y1: number, rc: number) {
  const qx = Math.min(Math.max(px, x0 + rc), x1 - rc);
  const qy = Math.min(Math.max(py, y0 + rc), y1 - rc);
  const dx = px - qx;
  const dy = py - qy;
  return dx * dx + dy * dy <= rc * rc;
}

// Police 5×7 pour U, N, O.
const GLYPH: Record<string, string[]> = {
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
};

function build(): string {
  const grid: (Key | null)[][] = [];
  const cx = W / 2;
  const cy = H * 0.47;
  const rx = 18;
  const ry = 12;
  const ang = (-12 * Math.PI) / 180;
  const cosA = Math.cos(ang);
  const sinA = Math.sin(ang);

  for (let y = 0; y < H; y++) {
    const row: (Key | null)[] = [];
    for (let x = 0; x < W; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      let c: Key | null = null;
      if (inRR(px, py, 0, 0, W, H, RC)) {
        const inner = inRR(px, py, BORDER, BORDER, W - BORDER, H - BORDER, Math.max(1, RC - BORDER));
        c = inner ? "K" : "W";
        if (inner) {
          const dx = px - cx;
          const dy = py - cy;
          const ex = (dx * cosA + dy * sinA) / rx;
          const ey = (-dx * sinA + dy * cosA) / ry;
          const v = ex * ex + ey * ey;
          if (v <= 1) c = v > 0.74 ? "D" : "R";
        }
      }
      row.push(c);
    }
    grid.push(row);
  }

  // "UNO" centré sur l'ovale.
  const s = 2;
  const gw = 5;
  const gap = 1;
  const word = "UNO";
  const totalW = (word.length * gw + (word.length - 1) * gap) * s;
  let gx = Math.round((W - totalW) / 2);
  const gy = Math.round(cy - (7 * s) / 2);
  for (const ch of word) {
    const g = GLYPH[ch];
    for (let r = 0; r < 7; r++) {
      for (let col = 0; col < gw; col++) {
        if (g[r][col] === "1") {
          for (let yy = 0; yy < s; yy++) {
            for (let xx = 0; xx < s; xx++) {
              const X = gx + col * s + xx;
              const Y = gy + r * s + yy;
              if (X >= 0 && X < W && Y >= 0 && Y < H && grid[Y][X] !== null) grid[Y][X] = "Y";
            }
          }
        }
      }
    }
    gx += (gw + gap) * s;
  }

  // Sérialisation : un <rect> par segment horizontal de même couleur.
  let rects = "";
  for (let y = 0; y < H; y++) {
    let x = 0;
    while (x < W) {
      const c = grid[y][x];
      if (c === null) {
        x++;
        continue;
      }
      let len = 1;
      while (x + len < W && grid[y][x + len] === c) len++;
      rects += `<rect x="${x}" y="${y}" width="${len}" height="1" fill="${PAL[c]}"/>`;
      x += len;
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges">${rects}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const CARD_BACK = build();
