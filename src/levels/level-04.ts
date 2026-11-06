import type { Cell, Level } from '../game/types'
import { cellsFrom, stateFrom } from './solution-helpers'

const cols = 15
const rows = 20
// 输入 A、B 和输出 C 由玩家自己放
const cells: (Cell | null)[] = new Array(cols * rows).fill(null)

// 参考解：两路非门合到 C，C = A AND B
const solution = cellsFrom(cols * rows, {
  0: { type: 'input', id: 'A' },
  1: { type: 'charger', dir: 1 },
  2: { type: 'not', dir: 1 },
  17: { type: 'wire' },
  18: { type: 'charger', dir: 1 },
  19: { type: 'not', dir: 1 },
  20: { type: 'wire' },
  21: { type: 'output', id: 'C' },
  30: { type: 'input', id: 'B' },
  31: { type: 'charger', dir: 1 },
  32: { type: 'not', dir: 1 },
})

const solutionState = stateFrom(cols * rows, {
  tick: 65,
  inputs: { A: 0, B: 0 },
  outputs: { C: 0 },
}, {
  2: 1,
  17: 3,
  18: 1,
  32: 1,
})

/** 第四关：与门，C = A AND B */
export const level04: Level = {
  id: 'level-04',
  no: 4,
  name: '与门',
  cols,
  rows,
  inputs: ['A', 'B'],
  outputs: ['C'],
  cells,
  solution: { cells: solution, state: solutionState },
  tests: [
    {
      name: 'A=0 B=0 → C=0',
      events: [{ tick: 0, values: { A: 0, B: 0 } }],
      checks: [{ from: 10, to: 20, outputs: { C: 0 } }],
    },
    {
      name: 'A=1 B=0 → C=0',
      events: [{ tick: 0, values: { A: 1, B: 0 } }],
      checks: [{ from: 10, to: 20, outputs: { C: 0 } }],
    },
    {
      name: 'A=0 B=1 → C=0',
      events: [{ tick: 0, values: { A: 0, B: 1 } }],
      checks: [{ from: 10, to: 20, outputs: { C: 0 } }],
    },
    {
      name: 'A=1 B=1 → C=1',
      events: [{ tick: 0, values: { A: 1, B: 1 } }],
      checks: [{ from: 10, to: 20, outputs: { C: 1 } }],
    },
  ],
}
