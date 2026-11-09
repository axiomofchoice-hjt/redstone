import type { Cell, Level } from '../game/types'
import { cellsFrom, stateFrom } from './solution-helpers'

const cols = 10
const rows = 10
// 输入 A、输出 Y 都由玩家自己放
const cells: (Cell | null)[] = new Array(cols * rows).fill(null)

/**
 * 参考解：A 分两路——一路经非门晚 1 tick，另一路经两个中继器晚 2 tick，两路在导线上相或。
 * 上升沿后第 1 tick 两路都还是 0，导线上空出 1 tick 的低电平，第二个非门把它翻成高电平，
 * 再经三个中继器送到 Y，正好是上升沿后第 5 tick 的 1 tick 脉冲。
 */
const solution = cellsFrom(cols * rows, {
  // 第 0 行：晚 1 tick 的那一路，缺口从这里进非门
  0: { type: 'input', id: 'A' },
  1: { type: 'charger', dir: 1 },
  2: { type: 'not', dir: 1 },
  3: { type: 'wire' },
  4: { type: 'charger', dir: 1 },
  5: { type: 'not', dir: 1 },
  6: { type: 'repeater', dir: 1 },
  7: { type: 'repeater', dir: 1 },
  8: { type: 'repeater', dir: 1 },
  9: { type: 'output', id: 'Y' },
  // 第 1 行：A 慢 2 tick 的那一支，也并到导线上
  10: { type: 'wire' },
  11: { type: 'repeater', dir: 1 },
  12: { type: 'repeater', dir: 1 },
  13: { type: 'wire' },
})

/** 导出时的一刻：A=0、Y=0（tick 104） */
const solutionState = stateFrom({ tick: 104, inputs: { A: 0 }, outputs: { Y: 0 } }, {
  2: 1,
  3: 3,
  4: 1,
  13: 3,
})

/**
 * 第十关：上升沿感应器。A 从 0 变 1 的那一拍之后第 5 tick，Y 出 1 tick 脉冲，其余时候 Y = 0。
 */
export const level10: Level = {
  id: 'level-10',
  no: 10,
  name: '上升沿感应器',
  brief: '',
  cols,
  rows,
  inputs: ['A'],
  outputs: ['Y'],
  cells,
  solution: { cells: solution, state: solutionState },
  tests: [
    {
      name: '上升沿 → 1 tick 脉冲',
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
      name: '下降沿不出脉冲',
      events: [
        { tick: 0, values: { A: 0 } },
        { tick: 12, values: { A: 1 } },
        { tick: 18, values: { A: 0 } },
      ],
      checks: [
        { from: 8, to: 16, outputs: { Y: 0 } },
        { from: 17, outputs: { Y: 1 } },
        { from: 18, to: 30, outputs: { Y: 0 } },
      ],
    },
    {
      name: '两个上升沿各出一个脉冲',
      events: [
        { tick: 0, values: { A: 0 } },
        { tick: 12, values: { A: 1 } },
        { tick: 16, values: { A: 0 } },
        { tick: 20, values: { A: 1 } },
      ],
      checks: [
        { from: 8, to: 16, outputs: { Y: 0 } },
        { from: 17, outputs: { Y: 1 } },
        { from: 18, to: 24, outputs: { Y: 0 } },
        { from: 25, outputs: { Y: 1 } },
        { from: 26, to: 32, outputs: { Y: 0 } },
      ],
    },
  ],
}
