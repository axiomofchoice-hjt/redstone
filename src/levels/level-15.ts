import type { Cell, Level } from '../game/types'
import { stateFrom } from './solution-helpers'

const cols = 10
const rows = 10
// 输入 S / R、输出 Y 都由玩家自己放
const cells: (Cell | null)[] = new Array(cols * rows).fill(null)

const build = (entries: [number, number, Cell][]) => {
  const out: (Cell | null)[] = new Array(cols * rows).fill(null)
  for (const [x, y, cell] of entries) out[y * cols + x] = cell
  return out
}

const wires = (pts: [number, number][]): [number, number, Cell][] =>
  pts.map(([x, y]) => [x, y, { type: 'wire' }])

/** 参考解：两个 NOR 交叉反馈，Q = ¬(R ∨ Q̄)、Q̄ = ¬(S ∨ Q) */
const solution = build([
  [9, 1, { type: 'input', id: 'R' }],
  [9, 3, { type: 'input', id: 'S' }],
  ...wires([
    [4, 1],
    [5, 1],
    [6, 1],
    [7, 1],
    [8, 1],
    [2, 2],
    [2, 4],
    [2, 5],
    [3, 5],
    [4, 5],
    [5, 5],
    [6, 5],
    [7, 5],
    [7, 4],
    [7, 3],
    [8, 3],
    [4, 3],
  ]),
  [3, 1, { type: 'charger', dir: 3 }],
  [2, 1, { type: 'not', dir: 1 }],
  [1, 2, { type: 'output', id: 'Y' }],
  [2, 3, { type: 'charger', dir: 2 }],
  [6, 3, { type: 'charger', dir: 3 }],
  [5, 3, { type: 'not', dir: 1 }],
  [4, 2, { type: 'charger', dir: 0 }],
])

/** 取「S 置位后保持 1」第 30 tick（Y=1）的状态，盖上去就能直接看到锁存结果 */
const solutionState = stateFrom(
  { tick: 30, inputs: { R: 0, S: 0 }, outputs: { Y: 1 } },
  {
    12: 1,
    21: 1, 22: 3,
    32: 1, 36: 1, 37: 3, 38: 3,
    42: 3, 47: 3,
    52: 3, 53: 3, 54: 3, 55: 3, 56: 3, 57: 3,
  },
)

/** 每组都先把 S、R 都设一遍，免得接上玩家当前开着的输入 */
const reset = (values: { S: 0 | 1; R: 0 | 1 }) => ({ tick: 0, values })

/**
 * 第十五关：RS 锁存器。S 拉一下 Y 变成 1，R 拉一下 Y 变成 0，
 * 两个都不拉时保持上一次的状态。S、R 同时为 1 不测。
 */
export const level15: Level = {
  id: 'level-15',
  no: 15,
  name: 'RS 锁存器',
  cols,
  rows,
  inputs: ['S', 'R'],
  outputs: ['Y'],
  cells,
  solution: { cells: solution, state: solutionState },
  tests: [
    {
      name: 'R 复位后保持 0',
      events: [
        reset({ S: 0, R: 1 }),
        { tick: 8, values: { R: 0 } },
      ],
      checks: [
        { from: 10, to: 18, outputs: { Y: 0 } },
        { from: 24, to: 34, outputs: { Y: 0 } },
      ],
    },
    {
      name: 'S 置位后保持 1',
      events: [
        reset({ S: 0, R: 1 }),
        { tick: 8, values: { R: 0 } },
        { tick: 16, values: { S: 1 } },
        { tick: 24, values: { S: 0 } },
      ],
      checks: [
        { from: 10, to: 16, outputs: { Y: 0 } },
        { from: 30, to: 42, outputs: { Y: 1 } },
      ],
    },
    {
      name: 'R 再清 0 后保持',
      events: [
        reset({ S: 1, R: 0 }),
        { tick: 8, values: { S: 0 } },
        { tick: 16, values: { R: 1 } },
        { tick: 24, values: { R: 0 } },
      ],
      checks: [
        { from: 10, to: 16, outputs: { Y: 1 } },
        { from: 30, to: 42, outputs: { Y: 0 } },
      ],
    },
    {
      name: '来回翻，各认一次',
      events: [
        reset({ S: 0, R: 1 }),
        { tick: 6, values: { R: 0 } },
        { tick: 10, values: { S: 1 } },
        { tick: 14, values: { S: 0 } },
        { tick: 20, values: { R: 1 } },
        { tick: 24, values: { R: 0 } },
        { tick: 30, values: { S: 1 } },
        { tick: 34, values: { S: 0 } },
      ],
      checks: [
        { from: 8, to: 10, outputs: { Y: 0 } },
        { from: 18, to: 20, outputs: { Y: 1 } },
        { from: 28, to: 30, outputs: { Y: 0 } },
        { from: 38, to: 46, outputs: { Y: 1 } },
      ],
    },
  ],
}
