import { LEVELS } from './src/layouts/Layout404B/levels'
import { solve } from './src/layouts/Layout404B/solver'

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
