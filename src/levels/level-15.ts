import type { Cell, Level } from '../game/types'
import { cellsFrom, stateFrom } from './solution-helpers'

const cols = 10
const rows = 10
// 输入 S / R、输出 Y 都由玩家自己放
const cells: (Cell | null)[] = new Array(cols * rows).fill(null)

/**
 * 参考解：两个非门交叉反馈的 NOR 锁存器。
 * Y = ¬R ∧ (S ∨ Y)：S 拉一下置 1、R 拉一下清 0，都不拉时保持。
 */
const solution = cellsFrom(cols * rows, {
  // 第 0 行：S 进来，充能器读它、非门往左下反馈
  0: { type: 'input', id: 'S' },
  1: { type: 'wire' },
  2: { type: 'charger', dir: 1 },
  3: { type: 'not', dir: 3 },
  // 第 1 行：R 并进这条导线，另一个非门把结果送回 Y 和 S 那条线
  11: { type: 'not', dir: 3 },
  12: { type: 'charger', dir: 3 },
  13: { type: 'wire' },
  14: { type: 'input', id: 'R' },
  // 第 2 行
  21: { type: 'output', id: 'Y' },
})

/** 导出时的一刻：S=0、R=0，Y=0（tick 82） */
const solutionState = stateFrom(
  { tick: 82, inputs: { S: 0, R: 0 }, outputs: { Y: 0 } },
  {
    3: 1,
    12: 1,
    13: 3,
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
  brief: '',
  cols,
  rows,
  inputs: ['S', 'R'],
  outputs: ['Y'],
  cells,
  solution: { cells: solution, state: solutionState },
  tests: [
    {
      name: 'R 复位后保持 0',
      // 每次输入变化后都等 10 tick 再查，慢一点的锁存器也不会被误判
      events: [
        reset({ S: 0, R: 1 }),
        { tick: 20, values: { R: 0 } },
      ],
      checks: [
        { from: 10, to: 19, outputs: { Y: 0 } },
        { from: 30, to: 50, outputs: { Y: 0 } },
      ],
    },
    {
      name: 'S 置位后保持 1',
      events: [
        reset({ S: 0, R: 1 }),
        { tick: 20, values: { R: 0 } },
        { tick: 40, values: { S: 1 } },
        { tick: 60, values: { S: 0 } },
      ],
      checks: [
        { from: 10, to: 19, outputs: { Y: 0 } },
        { from: 30, to: 39, outputs: { Y: 0 } },
        { from: 50, to: 59, outputs: { Y: 1 } },
        { from: 70, to: 90, outputs: { Y: 1 } },
      ],
    },
    {
      name: 'R 再清 0 后保持',
      events: [
        reset({ S: 1, R: 0 }),
        { tick: 20, values: { S: 0 } },
        { tick: 40, values: { R: 1 } },
        { tick: 60, values: { R: 0 } },
      ],
      checks: [
        { from: 10, to: 19, outputs: { Y: 1 } },
        { from: 30, to: 39, outputs: { Y: 1 } },
        { from: 50, to: 59, outputs: { Y: 0 } },
        { from: 70, to: 90, outputs: { Y: 0 } },
      ],
    },
    {
      name: '来回翻，各认一次',
      events: [
        reset({ S: 0, R: 1 }),
        { tick: 20, values: { R: 0 } },
        { tick: 40, values: { S: 1 } },
        { tick: 60, values: { S: 0 } },
        { tick: 80, values: { R: 1 } },
        { tick: 100, values: { R: 0 } },
        { tick: 120, values: { S: 1 } },
        { tick: 140, values: { S: 0 } },
      ],
      checks: [
        { from: 10, to: 19, outputs: { Y: 0 } },
        { from: 30, to: 39, outputs: { Y: 0 } },
        { from: 50, to: 59, outputs: { Y: 1 } },
        { from: 70, to: 79, outputs: { Y: 1 } },
        { from: 90, to: 99, outputs: { Y: 0 } },
        { from: 110, to: 119, outputs: { Y: 0 } },
        { from: 130, to: 139, outputs: { Y: 1 } },
        { from: 150, to: 160, outputs: { Y: 1 } },
      ],
    },
  ],
}
