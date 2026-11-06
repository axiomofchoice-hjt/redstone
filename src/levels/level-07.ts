import type { Cell, Level } from '../game/types'
import { cellsFrom, stateFrom } from './solution-helpers'

const cols = 15
const rows = 20
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
  17: { type: 'wire' },
  18: { type: 'charger', dir: 1 },
  19: { type: 'not', dir: 1 },
  20: { type: 'charger', dir: 0 },
  21: { type: 'wire' },
  // 第 2 行：B 的支路与汇合点
  30: { type: 'input', id: 'B' },
  31: { type: 'charger', dir: 1 },
  32: { type: 'not', dir: 1 },
  34: { type: 'wire' },
  35: { type: 'cross' },
  36: { type: 'wire' },
  37: { type: 'output', id: 'Y' },
  // 第 3 行
  47: { type: 'wire' },
  48: { type: 'charger', dir: 1 },
  49: { type: 'not', dir: 1 },
  50: { type: 'charger', dir: 0 },
  // 第 4 行：C 的支路
  60: { type: 'input', id: 'C' },
  61: { type: 'charger', dir: 1 },
  62: { type: 'not', dir: 1 },
  63: { type: 'wire' },
  64: { type: 'charger', dir: 1 },
  65: { type: 'wire' },
})

/** 导出时的一刻：A、B、C 都是 0，Y 也是 0 */
const solutionState = stateFrom(
  cols * rows,
  { tick: 66, inputs: { A: 0, B: 0, C: 0 }, outputs: { Y: 0 } },
  {
    2: 1, 3: 3, 4: 1,
    17: 3, 18: 1, 20: 1,
    32: 1, 35: 1,
    47: 3, 48: 1, 50: 1,
    62: 1, 63: 3, 64: 1, 65: 3,
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
