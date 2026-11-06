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
    [3, 0],
    [0, 1],
    [3, 1],
    [5, 2],
    [3, 3],
    [0, 4],
    [3, 4],
  ]),
  [1, 0, { type: 'charger', dir: 1 }],
  [2, 0, { type: 'not', dir: 1 }],
  [4, 0, { type: 'charger', dir: 1 }],
  [5, 0, { type: 'not', dir: 1 }],
  [1, 1, { type: 'repeater', dir: 1 }],
  [2, 1, { type: 'repeater', dir: 1 }],
  [5, 1, { type: 'repeater', dir: 2 }],
  [0, 2, { type: 'charger', dir: 2 }],
  [6, 2, { type: 'repeater', dir: 1 }],
  [7, 2, { type: 'repeater', dir: 1 }],
  [8, 2, { type: 'output', id: 'Y' }],
  [0, 3, { type: 'not', dir: 2 }],
  [1, 3, { type: 'charger', dir: 1 }],
  [2, 3, { type: 'not', dir: 1 }],
  [4, 3, { type: 'charger', dir: 1 }],
  [5, 3, { type: 'not', dir: 1 }],
  [1, 4, { type: 'repeater', dir: 1 }],
  [2, 4, { type: 'repeater', dir: 1 }],
])

/** 导出时的一刻：A=0、Y=0（tick 84） */
const solutionState = stateFrom(
  { tick: 84, inputs: { A: 0 }, outputs: { Y: 0 } },
  {
    2: 1,
    3: 3,
    4: 1,
    13: 3,
    30: 1,
    31: 1,
    33: 3,
    34: 1,
    40: 3,
    41: 1,
    42: 1,
    43: 3,
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
