import type { Cell, Level } from '../game/types'
import { cellsFrom, stateFrom } from './solution-helpers'

const cols = 10
const rows = 10
// 输入 A、输出 Y 都由玩家自己放
const cells: (Cell | null)[] = new Array(cols * rows).fill(null)

/**
 * 参考解：A 自己、晚 1 tick 的中继器、晚 2 tick 的两级中继器三路并到输出导线上相或，
 * 下降沿因此被拖后 2 tick，脉冲前沿不变、尾巴晚 2 tick。
 */
const solution = cellsFrom(cols * rows, {
  // 第 0 行：输出导线接 Y
  0: { type: 'input', id: 'A' },
  1: { type: 'wire' },
  2: { type: 'wire' },
  3: { type: 'wire' },
  4: { type: 'output', id: 'Y' },
  // 第 1 行：晚 1 tick 的那一路
  10: { type: 'wire' },
  11: { type: 'repeater', dir: 1 },
  12: { type: 'charger', dir: 1 },
  13: { type: 'wire' },
  // 第 2 行：晚 2 tick 的那一路
  20: { type: 'wire' },
  21: { type: 'repeater', dir: 1 },
  22: { type: 'repeater', dir: 1 },
  23: { type: 'wire' },
})

/** 导出时的一刻：A=0，Y=0 */
const solutionState = stateFrom({ tick: 55, inputs: { A: 0 }, outputs: { Y: 0 } })

/**
 * 第十一关：脉冲延长器。每个脉冲宽度加 2 tick：前沿跟输入同拍，尾巴晚 2 tick。
 */
export const level11: Level = {
  id: 'level-11',
  no: 11,
  name: '脉冲延长器',
  brief: '把 A 的每个脉冲延长 2 tick：前沿跟输入同一 tick，后沿晚 2 tick 落下。\n1 tick 的脉冲变成 3 tick，两个靠得近的脉冲也不能粘成一个。\n输入 A 和输出 Y 的位置自己定。',
  cols,
  rows,
  inputs: ['A'],
  outputs: ['Y'],
  cells,
  solution: { cells: solution, state: solutionState },
  tests: [
    {
      name: '1 tick 脉冲变 3 tick',
      // 前 10 tick 保持 A=0，把中继器里可能残留的 1 先冲掉；玩家带着 A=1 点测试也能过
      events: [
        { tick: 0, values: { A: 0 } },
        { tick: 15, values: { A: 1 } },
        { tick: 16, values: { A: 0 } },
      ],
      checks: [
        { from: 10, to: 14, outputs: { Y: 0 } },
        { from: 15, to: 17, outputs: { Y: 1 } },
        { from: 18, to: 25, outputs: { Y: 0 } },
      ],
    },
    {
      name: '3 tick 脉冲变 5 tick',
      events: [
        { tick: 0, values: { A: 0 } },
        { tick: 15, values: { A: 1 } },
        { tick: 18, values: { A: 0 } },
      ],
      checks: [
        { from: 10, to: 14, outputs: { Y: 0 } },
        { from: 15, to: 19, outputs: { Y: 1 } },
        { from: 20, to: 30, outputs: { Y: 0 } },
      ],
    },
    {
      name: '两个脉冲不会粘成一个',
      events: [
        { tick: 0, values: { A: 0 } },
        { tick: 15, values: { A: 1 } },
        { tick: 16, values: { A: 0 } },
        { tick: 19, values: { A: 1 } },
        { tick: 20, values: { A: 0 } },
      ],
      checks: [
        { from: 10, to: 14, outputs: { Y: 0 } },
        { from: 15, to: 17, outputs: { Y: 1 } },
        { from: 18, outputs: { Y: 0 } },
        { from: 19, to: 21, outputs: { Y: 1 } },
        { from: 22, to: 30, outputs: { Y: 0 } },
      ],
    },
  ],
}
