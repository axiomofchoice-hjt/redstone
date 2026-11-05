import type { Cell, Level } from '../game/types'

const cols = 20
const rows = 14
const cells: (Cell | null)[] = new Array(cols * rows).fill(null)
const at = (x: number, y: number) => y * cols + x

cells[at(1, 6)] = { type: 'input', id: 'A', locked: true }
cells[at(1, 8)] = { type: 'input', id: 'B', locked: true }
cells[at(18, 7)] = { type: 'output', id: 'C', locked: true }

/**
 * 示例关（占位）。等真实关卡数据。
 */
export const level01: Level = {
  id: 'demo-01',
  name: '示例关',
  cols,
  rows,
  inputs: ['A', 'B'],
  outputs: ['C'],
  cells,
  tests: [],
}
