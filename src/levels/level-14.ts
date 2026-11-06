import type { Cell, Level } from '../game/types'
import { stateFrom } from './solution-helpers'

const cols = 10
const rows = 10
// 输入 A、输出 Y 都由玩家自己放
const cells: (Cell | null)[] = new Array(cols * rows).fill(null)

const build = (entries: [number, number, Cell][]) => {
  const out: (Cell | null)[] = new Array(cols * rows).fill(null)
  for (const [x, y, cell] of entries) out[y * cols + x] = cell
  return out
}

const wires = (pts: [number, number][]): [number, number, Cell][] =>
  pts.map(([x, y]) => [x, y, { type: 'wire' }])

/** 参考解：上升沿、下降沿各一套感应，合流后接 Y */
const solution = build([
  [0, 0, { type: 'input', id: 'A' }],
  ...wires([
    [0, 1],
    [1, 1],
    [4, 1],
    [7, 1],
    [0, 2],
    [1, 2],
    [4, 2],
    [7, 2],
    [0, 3],
    [7, 3],
    [1, 5],
    [4, 5],
    [7, 5],
    [1, 6],
    [4, 6],
    [7, 6],
  ]),
  [2, 1, { type: 'charger', dir: 1 }],
  [3, 1, { type: 'not', dir: 1 }],
  [2, 2, { type: 'repeater', dir: 1 }],
  [3, 2, { type: 'repeater', dir: 1 }],
  [5, 1, { type: 'charger', dir: 1 }],
  [6, 1, { type: 'not', dir: 1 }],
  [0, 4, { type: 'charger', dir: 2 }],
  [0, 5, { type: 'not', dir: 1 }],
  [2, 5, { type: 'charger', dir: 1 }],
  [3, 5, { type: 'not', dir: 2 }],
  [5, 5, { type: 'charger', dir: 1 }],
  [6, 5, { type: 'not', dir: 2 }],
  [2, 6, { type: 'repeater', dir: 1 }],
  [3, 6, { type: 'repeater', dir: 1 }],
  [7, 4, { type: 'repeater', dir: 2 }],
  [7, 7, { type: 'repeater', dir: 2 }],
  [7, 8, { type: 'repeater', dir: 2 }],
  [7, 9, { type: 'output', id: 'Y' }],
])

/** 取「上升沿出脉冲」第 17 tick（Y=1）的状态，盖上去就能直接看到脉冲 */
const solutionState = stateFrom(
  { tick: 17, inputs: { A: 1 }, outputs: { Y: 1 } },
  {
    0: 1,
    10: 3, 11: 3, 12: 1, 14: 3, 15: 1,
    20: 3, 21: 3, 22: 1, 23: 1, 24: 3,
    30: 3,
    40: 1,
    53: 1, 54: 3, 55: 1,
    64: 3,
    87: 1,
    97: 1,
  },
)

/**
 * 第十四关：双边沿感应器。A 不管是变高还是变低，之后第 5 tick 出 1 tick 脉冲，其余时候 Y = 0。
 */
export const level14: Level = {
  id: 'level-14',
  no: 14,
  name: '双边沿感应器',
  cols,
  rows,
  inputs: ['A'],
  outputs: ['Y'],
  cells,
  solution: { cells: solution, state: solutionState },
  tests: [
    {
      name: '上升沿出脉冲',
      // 先 A=0 空跑几拍，电路预热好再给上升沿
      events: [
        { tick: 0, values: { A: 0 } },
        { tick: 12, values: { A: 1 } },
      ],
      checks: [
        { from: 8, to: 16, outputs: { Y: 0 } },
        { from: 17, outputs: { Y: 1 } },
        { from: 18, to: 26, outputs: { Y: 0 } },
      ],
    },
    {
      name: '下降沿也出脉冲',
      events: [
        { tick: 0, values: { A: 0 } },
        { tick: 12, values: { A: 1 } },
        { tick: 18, values: { A: 0 } },
      ],
      checks: [
        { from: 8, to: 16, outputs: { Y: 0 } },
        { from: 17, outputs: { Y: 1 } },
        { from: 18, to: 22, outputs: { Y: 0 } },
        { from: 23, outputs: { Y: 1 } },
        { from: 24, to: 30, outputs: { Y: 0 } },
      ],
    },
    {
      name: '连续翻转各出一次',
      events: [
        { tick: 0, values: { A: 0 } },
        { tick: 12, values: { A: 1 } },
        { tick: 18, values: { A: 0 } },
        { tick: 24, values: { A: 1 } },
      ],
      checks: [
        { from: 8, to: 16, outputs: { Y: 0 } },
        { from: 17, outputs: { Y: 1 } },
        { from: 18, to: 22, outputs: { Y: 0 } },
        { from: 23, outputs: { Y: 1 } },
        { from: 24, to: 28, outputs: { Y: 0 } },
        { from: 29, outputs: { Y: 1 } },
        { from: 30, to: 36, outputs: { Y: 0 } },
      ],
    },
    {
      name: '一直高电平只出一次',
      events: [
        { tick: 0, values: { A: 0 } },
        { tick: 12, values: { A: 1 } },
      ],
      checks: [
        { from: 8, to: 16, outputs: { Y: 0 } },
        { from: 17, outputs: { Y: 1 } },
        { from: 18, to: 32, outputs: { Y: 0 } },
      ],
    },
  ],
}
