import type { Cell, Level } from '../game/types'
import { cellsFrom, stateFrom } from './solution-helpers'

const cols = 15
const rows = 20
// 输入 A、B 和输出 C 由玩家自己放
const cells: (Cell | null)[] = new Array(cols * rows).fill(null)

// 参考解：A、B 各自反相后合成异或
const solution = cellsFrom(cols * rows, {
  0: { type: 'input', id: 'A' },
  1: { type: 'charger', dir: 1 },
  2: { type: 'not', dir: 1 },
  3: { type: 'wire' },
  4: { type: 'wire' },
  5: { type: 'charger', dir: 1 },
  6: { type: 'not', dir: 1 },
  17: { type: 'wire' },
  18: { type: 'charger', dir: 1 },
  19: { type: 'not', dir: 1 },
  21: { type: 'wire' },
  22: { type: 'wire' },
  23: { type: 'output', id: 'C' },
  30: { type: 'input', id: 'B' },
  31: { type: 'charger', dir: 1 },
  32: { type: 'not', dir: 1 },
  33: { type: 'wire' },
  34: { type: 'wire' },
  35: { type: 'charger', dir: 1 },
  36: { type: 'not', dir: 1 },
})

const solutionState = stateFrom(cols * rows, {
  tick: 16,
  inputs: { A: 0, B: 0 },
  outputs: { C: 0 },
}, {
  2: 1,
  3: 3,
  4: 3,
  5: 1,
  17: 3,
  18: 1,
  32: 1,
  33: 3,
  34: 3,
  35: 1,
})

/** 第五关：异或门，C = A XOR B */
export const level05: Level = {
  id: 'level-05',
  no: 5,
  name: '异或门',
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
      name: 'A=1 B=0 → C=1',
      events: [{ tick: 0, values: { A: 1, B: 0 } }],
      checks: [{ from: 10, to: 20, outputs: { C: 1 } }],
    },
    {
      name: 'A=0 B=1 → C=1',
      events: [{ tick: 0, values: { A: 0, B: 1 } }],
      checks: [{ from: 10, to: 20, outputs: { C: 1 } }],
    },
    {
      name: 'A=1 B=1 → C=0',
      events: [{ tick: 0, values: { A: 1, B: 1 } }],
      checks: [{ from: 10, to: 20, outputs: { C: 0 } }],
    },
  ],
}
