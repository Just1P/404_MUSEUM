export type CellType = 'empty' | 'wall' | 'hole' | 'pion'

export type Grid = CellType[][]

export type FallAnim = { row: number; col: number; dist: number } | null

export type Level = { grid: Grid; par: number }
