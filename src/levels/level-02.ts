import type { Cell, Level } from '../game/types'

const cols = 7
const rows = 7
const cells: (Cell | null)[] = new Array(cols * rows).fill(null)

// A 在第 2 行第 1 列，B 在第 4 行第 1 列，C 在第 3 行第 5 列（都从 0 开始数），预置且锁定
const at = (x: number, y: number) => y * cols + x
cells[at(1, 2)] = { type: 'input', id: 'A', locked: true }
cells[at(1, 4)] = { type: 'input', id: 'B', locked: true }
cells[at(5, 3)] = { type: 'output', id: 'C', locked: true }

/** 第二关：或门，C = A OR B，只能用导线 */
export const level02: Level = {
  id: 'level-02',
  no: 2,
  name: '或门',
  cols,
  rows,
  inputs: ['A', 'B'],
  outputs: ['C'],
  tools: ['wire'],
  cells,
  tests: [
    { name: 'A=0 B=0 → C=0', checks: [{ from: 0, to: 20, outputs: { C: 0 } }] },
    {
      name: 'A=1 B=0 → C=1',
      events: [{ tick: 0, values: { A: 1, B: 0 } }],
      checks: [{ from: 0, to: 20, outputs: { C: 1 } }],
    },
    {
      name: 'A=0 B=1 → C=1',
      events: [{ tick: 0, values: { A: 0, B: 1 } }],
      checks: [{ from: 0, to: 20, outputs: { C: 1 } }],
    },
    {
      name: 'A=1 B=1 → C=1',
      events: [{ tick: 0, values: { A: 1, B: 1 } }],
      checks: [{ from: 0, to: 20, outputs: { C: 1 } }],
    },
  ],
}
