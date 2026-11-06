import type { Cell, Level } from '../game/types'
import { cellsFrom, stateFrom } from './solution-helpers'

const cols = 10
const rows = 10
// 三个输入 A、B、C 和输出 Y 由玩家自己放
const cells: (Cell | null)[] = new Array(cols * rows).fill(null)

/** 参考解：三组「输入 + 非门」分别算 A AND B、A AND C、B AND C，再用交叉导线汇到 Y */
const solution = cellsFrom(cols * rows, {
  // 第 0 行：A 的支路
  0: { type: 'input', id: 'A' },
  1: { type: 'charger', dir: 1 },
  2: { type: 'not', dir: 1 },
  3: { type: 'wire' },
  4: { type: 'charger', dir: 1 },
  5: { type: 'not', dir: 1 },
  6: { type: 'wire' },
  // 第 1 行
  12: { type: 'wire' },
  13: { type: 'charger', dir: 1 },
  14: { type: 'not', dir: 1 },
  15: { type: 'charger', dir: 0 },
  16: { type: 'wire' },
  // 第 2 行：B 的支路与汇合点
  20: { type: 'input', id: 'B' },
  21: { type: 'charger', dir: 1 },
  22: { type: 'not', dir: 1 },
  24: { type: 'wire' },
  25: { type: 'cross' },
  26: { type: 'wire' },
  27: { type: 'output', id: 'Y' },
  // 第 3 行
  32: { type: 'wire' },
  33: { type: 'charger', dir: 1 },
  34: { type: 'not', dir: 1 },
  35: { type: 'charger', dir: 0 },
  // 第 4 行：C 的支路
  40: { type: 'input', id: 'C' },
  41: { type: 'charger', dir: 1 },
  42: { type: 'not', dir: 1 },
  43: { type: 'wire' },
  44: { type: 'charger', dir: 1 },
  45: { type: 'wire' },
})

/** 导出时的一刻：A、B、C 都是 0，Y 也是 0 */
const solutionState = stateFrom(
  { tick: 66, inputs: { A: 0, B: 0, C: 0 }, outputs: { Y: 0 } },
  {
    2: 1, 3: 3, 4: 1,
    12: 3, 13: 1, 15: 1,
    22: 1, 25: 1,
    32: 3, 33: 1, 35: 1,
    42: 1, 43: 3, 44: 1, 45: 3,
  },
)

/** 第七关：三人投票器，至少两人投 1 时 Y = 1 */
export const level07: Level = {
  id: 'level-07',
  no: 7,
  name: '三人投票器',
  cols,
  rows,
  inputs: ['A', 'B', 'C'],
  outputs: ['Y'],
  cells,
  solution: { cells: solution, state: solutionState },
  tests: [
    {
      name: '0 0 0 → 0',
      events: [{ tick: 0, values: { A: 0, B: 0, C: 0 } }],
      checks: [{ from: 10, to: 20, outputs: { Y: 0 } }],
    },
    {
      name: '0 0 1 → 0',
      events: [{ tick: 0, values: { A: 0, B: 0, C: 1 } }],
      checks: [{ from: 10, to: 20, outputs: { Y: 0 } }],
    },
    {
      name: '0 1 0 → 0',
      events: [{ tick: 0, values: { A: 0, B: 1, C: 0 } }],
      checks: [{ from: 10, to: 20, outputs: { Y: 0 } }],
    },
    {
      name: '0 1 1 → 1',
      events: [{ tick: 0, values: { A: 0, B: 1, C: 1 } }],
      checks: [{ from: 10, to: 20, outputs: { Y: 1 } }],
    },
    {
      name: '1 0 0 → 0',
      events: [{ tick: 0, values: { A: 1, B: 0, C: 0 } }],
      checks: [{ from: 10, to: 20, outputs: { Y: 0 } }],
    },
    {
      name: '1 0 1 → 1',
      events: [{ tick: 0, values: { A: 1, B: 0, C: 1 } }],
      checks: [{ from: 10, to: 20, outputs: { Y: 1 } }],
    },
    {
      name: '1 1 0 → 1',
      events: [{ tick: 0, values: { A: 1, B: 1, C: 0 } }],
      checks: [{ from: 10, to: 20, outputs: { Y: 1 } }],
    },
    {
      name: '1 1 1 → 1',
      events: [{ tick: 0, values: { A: 1, B: 1, C: 1 } }],
      checks: [{ from: 10, to: 20, outputs: { Y: 1 } }],
    },
  ],
}
