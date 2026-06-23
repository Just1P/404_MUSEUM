import { LEVELS } from './src/layouts/Layout404B/levels'
import type { Grid } from './src/layouts/Layout404B/types'

function rotateRight(grid: Grid): Grid {
  const n = grid.length
  return Array.from({ length: n }, (_, r) =>
    Array.from({ length: n }, (_, c) => grid[n - 1 - c][r])
  )
}

function rotateLeft(grid: Grid): Grid {
  const n = grid.length
  return Array.from({ length: n }, (_, r) =>
    Array.from({ length: n }, (_, c) => grid[c][n - 1 - r])
  )
}

function applyGravity(grid: Grid): Grid {
  const n = grid.length
  const next: Grid = grid.map(row => [...row])
  let pr = -1, pc = -1
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      if (next[r][c] === 'pion') { pr = r; pc = c }
  if (pr === -1) return next
  next[pr][pc] = 'empty'
  let target = pr
  for (let r = pr + 1; r < n; r++) {
    if (next[r][pc] === 'wall') break
    if (next[r][pc] === 'hole') { target = r; break }
    target = r
  }
  next[target][pc] = 'pion'
  return next
}

function checkWin(grid: Grid, original: Grid): boolean {
  for (let r = 0; r < grid.length; r++)
    for (let c = 0; c < grid[r].length; c++)
      if (grid[r][c] === 'pion' && original[r][c] === 'hole') return true
  return false
}

function serialize(grid: Grid): string {
  return grid.map(r => r.join(',')).join('|')
}

function solve(initial: Grid): string[] | null {
  const queue: { grid: Grid; moves: string[] }[] = [{ grid: initial, moves: [] }]
  const visited = new Set([serialize(initial)])

  while (queue.length) {
    const { grid, moves } = queue.shift()!
    for (const dir of ['left', 'right'] as const) {
      const rotated = dir === 'right' ? rotateRight(grid) : rotateLeft(grid)
      const next = applyGravity(rotated)
      const nextMoves = [...moves, dir]
      if (checkWin(next, initial)) return nextMoves
      const key = serialize(next)
      if (!visited.has(key)) {
        visited.add(key)
        queue.push({ grid: next, moves: nextMoves })
      }
    }
  }
  return null
}

const arg = parseInt(process.argv[2])
if (isNaN(arg) || arg < 0 || arg >= LEVELS.length) {
  console.log(`Usage: npx tsx solver.ts <index>  (0 à ${LEVELS.length - 1})`)
  process.exit(1)
}

console.log(`\nRésolution du niveau ${arg + 1}...\n`)
const solution = solve(LEVELS[arg].grid)
if (solution) {
  console.log(`✓ Solution en ${solution.length} moves :`)
  solution.forEach((m, i) => console.log(`  ${i + 1}. ${m === 'left' ? '← left' : '→ right'}`))
} else {
  console.log('✗ Aucune solution trouvée.')
}
