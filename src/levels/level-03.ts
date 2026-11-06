import type { Cell, Level } from '../game/types'

const cols = 7
const rows = 7
const cells: (Cell | null)[] = new Array(cols * rows).fill(null)

// 摆放同第一关：A 在第 3 行第 1 列，B 在第 3 行第 5 列（都从 0 开始数），预置且锁定
const at = (x: number, y: number) => y * cols + x
cells[at(1, 3)] = { type: 'input', id: 'A', locked: true }
cells[at(5, 3)] = { type: 'output', id: 'B', locked: true }

/** 第三关：非门，B = NOT A，只放开导线、充能器、非门 */
export const level03: Level = {
  id: 'level-03',
  no: 3,
  name: '非门',
  cols,
  rows,
  inputs: ['A'],
  outputs: ['B'],
  tools: ['wire', 'charger', 'not'],
  cells,
  tests: [
    {
      name: 'A=0 → B=1',
      checks: [{ from: 10, to: 20, outputs: { B: 1 } }],
    },
    {
      name: 'A=1 → B=0',
      events: [{ tick: 0, values: { A: 1 } }],
      checks: [{ from: 10, to: 20, outputs: { B: 0 } }],
    },
  ],
}
