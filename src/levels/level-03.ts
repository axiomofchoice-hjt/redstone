import type { Cell, Level } from '../game/types'
import { cellsFrom, stateFrom } from './solution-helpers'

const cols = 7
const rows = 7
const cells: (Cell | null)[] = new Array(cols * rows).fill(null)

// 摆放同第一关：A 在第 3 行第 1 列，B 在第 3 行第 5 列（都从 0 开始数），预置且锁定
const at = (x: number, y: number) => y * cols + x
cells[at(1, 3)] = { type: 'input', id: 'A', locked: true }
cells[at(5, 3)] = { type: 'output', id: 'B', locked: true }

// 参考解：A 经充能器、非门接 B
const solution = cellsFrom(cols * rows, {
  22: { type: 'input', id: 'A', locked: true },
  23: { type: 'charger', dir: 1 },
  24: { type: 'not', dir: 1 },
  25: { type: 'wire' },
  26: { type: 'output', id: 'B', locked: true },
})

const solutionState = stateFrom({
  tick: 16,
  inputs: { A: 0 },
  outputs: { B: 1 },
}, {
  24: 1,
  25: 3,
  26: 1,
})

/** 第三关：非门，B = NOT A，只放开导线、充能器、非门 */
export const level03: Level = {
  id: 'level-03',
  no: 3,
  name: '非门',
  brief: 'B = NOT A：A 为 1 时 B 为 0，A 为 0 时 B 为 1。\n这一关可用导线、充能器、非门。',
  cols,
  rows,
  inputs: ['A'],
  outputs: ['B'],
  tools: ['wire', 'charger', 'not'],
  cells,
  solution: { cells: solution, state: solutionState },
  tests: [
    {
      name: 'A=0 → B=1',
      events: [{ tick: 0, values: { A: 0 } }],
      checks: [{ from: 10, to: 20, outputs: { B: 1 } }],
    },
    {
      name: 'A=1 → B=0',
      events: [{ tick: 0, values: { A: 1 } }],
      checks: [{ from: 10, to: 20, outputs: { B: 0 } }],
    },
  ],
}
