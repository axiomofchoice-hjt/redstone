import type { Cell, Level } from '../game/types'
import { cellsFrom, stateFrom } from './solution-helpers'

const cols = 10
const rows = 10
// 输入 A、B 和输出 S、C 由玩家自己放
const cells: (Cell | null)[] = new Array(cols * rows).fill(null)

/** 参考解：上面一组算 A XOR B 接 S，下面一组算 A AND B 接 C，中间用两条竖直导线汇合 */
const solution = cellsFrom(cols * rows, {
  // 第 0 行：A 的异或支路
  0: { type: 'input', id: 'A' },
  1: { type: 'charger', dir: 1 },
  2: { type: 'not', dir: 1 },
  3: { type: 'wire' },
  4: { type: 'wire' },
  5: { type: 'charger', dir: 1 },
  6: { type: 'not', dir: 1 },
  7: { type: 'wire' },
  8: { type: 'wire' },
  // 第 1 行：上下两组往中间汇
  12: { type: 'wire' },
  14: { type: 'wire' },
  18: { type: 'wire' },
  // 第 2 行：汇合后接 C、S
  22: { type: 'wire' },
  23: { type: 'charger', dir: 1 },
  24: { type: 'not', dir: 1 },
  25: { type: 'wire' },
  26: { type: 'output', id: 'C' },
  28: { type: 'output', id: 'S' },
  // 第 3 行
  32: { type: 'wire' },
  34: { type: 'wire' },
  38: { type: 'wire' },
  // 第 4 行：B 的与门支路
  40: { type: 'input', id: 'B' },
  41: { type: 'charger', dir: 1 },
  42: { type: 'not', dir: 1 },
  43: { type: 'wire' },
  44: { type: 'wire' },
  45: { type: 'charger', dir: 1 },
  46: { type: 'not', dir: 1 },
  47: { type: 'wire' },
  48: { type: 'wire' },
})

/** 导出时的一刻：A、B 都是 0，S、C 都是 0 */
const solutionState = stateFrom(
  { tick: 18, inputs: { A: 0, B: 0 }, outputs: { C: 0, S: 0 } },
  {
    2: 1, 3: 3, 4: 3, 5: 1,
    12: 3, 14: 3,
    22: 3, 23: 1,
    32: 3, 34: 3,
    42: 1, 43: 3, 44: 3, 45: 1,
  },
)

/** 第六关：半加器，S = A XOR B（和），C = A AND B（进位） */
export const level06: Level = {
  id: 'level-06',
  no: 6,
  name: '半加器',
  brief: '半加器：S = A XOR B 是本位和，C = A AND B 是进位。\n输入 A、B 和输出 S、C 的位置自己定。',
  cols,
  rows,
  inputs: ['A', 'B'],
  outputs: ['S', 'C'],
  cells,
  solution: { cells: solution, state: solutionState },
  tests: [
    {
      name: 'A=0 B=0 → S=0 C=0',
      events: [{ tick: 0, values: { A: 0, B: 0 } }],
      checks: [{ from: 10, to: 20, outputs: { S: 0, C: 0 } }],
    },
    {
      name: 'A=1 B=0 → S=1 C=0',
      events: [{ tick: 0, values: { A: 1, B: 0 } }],
      checks: [{ from: 10, to: 20, outputs: { S: 1, C: 0 } }],
    },
    {
      name: 'A=0 B=1 → S=1 C=0',
      events: [{ tick: 0, values: { A: 0, B: 1 } }],
      checks: [{ from: 10, to: 20, outputs: { S: 1, C: 0 } }],
    },
    {
      name: 'A=1 B=1 → S=0 C=1',
      events: [{ tick: 0, values: { A: 1, B: 1 } }],
      checks: [{ from: 10, to: 20, outputs: { S: 0, C: 1 } }],
    },
  ],
}
