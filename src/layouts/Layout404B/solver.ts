import type { Grid } from "./types";

export type Move = "left" | "right";

export function rotateRight(grid: Grid): Grid {
  const n = grid.length;
  return Array.from({ length: n }, (_, r) =>
    Array.from({ length: n }, (_, c) => grid[n - 1 - c][r]),
  );
}

export function rotateLeft(grid: Grid): Grid {
  const n = grid.length;
  return Array.from({ length: n }, (_, r) =>
    Array.from({ length: n }, (_, c) => grid[c][n - 1 - r]),
  );
}

/** Drops the pion. `won` is true when it lands on a hole of the current grid. */
export function applyGravity(grid: Grid): { grid: Grid; won: boolean } {
  const n = grid.length;
  const next: Grid = grid.map((row) => [...row]);

  let pr = -1, pc = -1;
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      if (next[r][c] === "pion") { pr = r; pc = c; }

  if (pr === -1) return { grid: next, won: false };

  next[pr][pc] = "empty";

  let target = pr;
  let won = false;
  for (let r = pr + 1; r < n; r++) {
    if (next[r][pc] === "wall") break;
    if (next[r][pc] === "hole") { target = r; won = true; break; }
    target = r;
  }

  next[target][pc] = "pion";
  return { grid: next, won };
}

function serialize(grid: Grid): string {
  return grid.map((r) => r.join(",")).join("|");
}

/** BFS over rotations. Returns the shortest move sequence, or null if unsolvable. */
export function solve(initial: Grid): Move[] | null {
  const queue: { grid: Grid; moves: Move[] }[] = [{ grid: initial, moves: [] }];
  const visited = new Set([serialize(initial)]);

  while (queue.length) {
    const { grid, moves } = queue.shift()!;
    for (const dir of ["left", "right"] as const) {
      const rotated = dir === "right" ? rotateRight(grid) : rotateLeft(grid);
      const { grid: next, won } = applyGravity(rotated);
      const nextMoves: Move[] = [...moves, dir];
      if (won) return nextMoves;
      const key = serialize(next);
      if (!visited.has(key)) {
        visited.add(key);
        queue.push({ grid: next, moves: nextMoves });
      }
    }
  }
  return null;
}
